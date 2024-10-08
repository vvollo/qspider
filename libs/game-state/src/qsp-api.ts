import { initQspEngine, QspAPI, QspErrorData, QspPanel, QspVariableType } from '@qsp/wasm-engine';
import { atom } from 'xoid';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import wasmUrl from '@qsp/wasm-engine/qsp-engine.wasm?url';
import { useEffect, useState } from 'react';
import {
  actions$,
  cmdText$,
  isActsVisible$,
  isCmdVisible$,
  isNewLoc$,
  isObjsVisible$,
  isStatsVisible$,
  mainContent$,
  newLocHash$,
  nextMainContent$,
  objects$,
  statsContent$,
  view$,
} from './panels';
import { baseUrl$, currentGameEntry$, GameCommand, onGameCommand } from './current-game';
import { gameSavedCallback$, requestedAction$, restoreFromPath, saveLoadedCallback$, saveToPath } from './save';
import { counterDelay$, withCounterPaused } from './counter';
import { wait$ } from './wait';
import { convertQsps, prepareContent, prepareList } from './utils';
import { cleanPath, hashString } from '@qspider/utils';
import { menu$ } from './menu';
import { input$ } from './input';
import { sounds$ } from './audio';
import { msg$ } from './msg';
import { qspiderCommands } from './qspider-commands';
import qspiderModuleContent from './modules/qspider.qsps?raw';
import { readQsps, writeQsp } from '@qsp/converters';
import { fetchBinaryContent, windowManager } from '@qspider/env';
import { checkCondition } from './conditions';

export const qspApi$ = atom<QspAPI>();
export const qspApiInitialized$ = atom(false);
export const qspError$ = atom<QspErrorData | null>(null);
export const qspiderModule$ = atom(writeQsp(readQsps(qspiderModuleContent)));

export async function initQspApi(): Promise<void> {
  const wasm = await fetch(wasmUrl).then((r) => r.arrayBuffer());
  const api = await initQspEngine(wasm);
  console.log(`QSP version: ${api.version()}`);
  qspApi$.set(api);
  qspApiInitialized$.set(true);
}

export function execCode(code: string): void {
  qspApi$.value?.execCode(code);
}

export function onLinkClicked(href: string): void {
  if (href.toLowerCase().startsWith('exec:')) {
    execCode(href.substring(5));
  } else {
    window.location.href = href;
  }
}

export function useQspVariable<Name extends string, T = QspVariableType<Name>>(
  name: Name | undefined,
  key: string,
  index: number,
  defaultValue: T,
): T {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    if (!name) return;
    const unsubscribe = key
      ? qspApi$.value?.watchVariableByKey(name, key, (value) => setValue((value as unknown as T) || defaultValue))
      : qspApi$.value?.watchVariableByIndex(name, index, (value) => setValue((value as unknown as T) || defaultValue));
    return (): void => {
      unsubscribe?.();
    };
  }, [name, key, index, defaultValue]);

  return value;
}

export function useQspExpression(variable: string, condition: [string, string]): boolean {
  const [value, setValue] = useState(false);
  useEffect(() => {
    if (!variable) return;
    const unsubscribe = qspApi$.value?.watchVariable(variable, (value) => {
      setValue(checkCondition(value, condition));
    });
    return (): void => {
      unsubscribe?.();
    };
  }, [variable, condition]);
  return value;
}

qspApi$.subscribe((api) => {
  api.on('version', (type, callback) => {
    switch (type) {
      case 'player':
        return callback('qSpider');
      case 'platform':
        return callback(windowManager.isBrowser ? 'browser' : windowManager.platform || 'unknown');
    }
    return callback(api.version());
  });
  api.on('error', qspError$.set);
  api.on('system_cmd', (cmd: string): void => {
    if (!cmd.startsWith('qspider')) return;
    const [, _cmd] = cmd.split('.');
    for (const [prefix, processor] of Object.entries(qspiderCommands)) {
      if (_cmd.trim().startsWith(prefix)) {
        const data = _cmd.replace(prefix, '');
        processor(data);
      }
    }
  });
  api.on('is_play', (path, result) => {
    result(sounds$.actions.isPlaying(path));
  });
  api.on('play_file', (path, volume, ready) => {
    sounds$.actions.play(path, volume);
    ready();
  });
  api.on('close_file', (path, ready) => {
    if (path) {
      sounds$.actions.close(path);
    } else {
      sounds$.actions.closeAll();
    }
    ready();
  });
  api.on('timer', (ms) => {
    counterDelay$.set(ms);
  });
  api.on('open_game', async (file, isNewGame, onOpened) => {
    if (file === 'qspider') {
      api.openGame(qspiderModule$.value, false);
      onOpened();
      return;
    }
    withCounterPaused(async () => {
      const source = await fetchBinaryContent(baseUrl$.value, file);
      let gameSource = source;
      const isQsps = file.toLowerCase().endsWith('.qsps');
      if (isQsps) {
        gameSource = convertQsps(source);
      }
      if (isNewGame) {
        const path = cleanPath(file);
        baseUrl$.update((url) => url + path.slice(0, path.lastIndexOf('/') + 1));
      }
      api.openGame(gameSource, isNewGame);
      onOpened();
    });
  });
  api.on('input', (text, finished) => {
    input$.actions.open(text, finished);
  });
  api.on('menu', (items, select) => {
    menu$.actions.open(prepareList(items), select);
  });
  api.on('msg', (text, closed) => {
    msg$.actions.open(text, closed);
  });
  api.on('main_changed', (text) => {
    const prevMain = mainContent$.value;
    const nextMain = prepareContent(text);
    const isNewLoc = !prevMain || (nextMain !== prevMain && !nextMain.startsWith(prevMain));
    isNewLoc$.set(isNewLoc);
    nextMainContent$.set(nextMain);
    if (isNewLoc) {
      newLocHash$.set(String(hashString(nextMainContent$.value)));
    } else {
      mainContent$.set(nextMain);
    }
  });
  api.on('stats_changed', (text) => {
    statsContent$.set(prepareContent(text));
  });
  api.on('actions_changed', (actions) => {
    actions$.set(prepareList(actions));
  });
  api.on('objects_changed', (objects) => {
    objects$.set(prepareList(objects));
  });
  api.on('user_input', (text) => {
    cmdText$.set(text);
  });
  api.on('view', (path) => {
    if (path) {
      view$.actions.open(path);
    } else {
      view$.actions.close();
    }
  });
  api.on('panel_visibility', (type, isShown) => {
    switch (type) {
      case QspPanel.STAT:
        isStatsVisible$.set(isShown);
        break;
      case QspPanel.ACTS:
        isActsVisible$.set(isShown);
        break;
      case QspPanel.OBJS:
        isObjsVisible$.set(isShown);
        break;
      case QspPanel.INPUT:
        isCmdVisible$.set(isShown);
        break;
    }
  });
  api.on('load_save', async (path, loaded) => {
    const currentGame = currentGameEntry$.value;
    if (!currentGame) return loaded();
    saveLoadedCallback$.set(() => {
      loaded();
    });
    if (path) {
      await restoreFromPath(path);
    } else {
      requestedAction$.set('load');
      onGameCommand('pause:saves' as GameCommand);
    }
  });
  api.on('save_game', async (path, saved) => {
    const currentGame = currentGameEntry$.value;
    if (!currentGame) return saved();
    gameSavedCallback$.set(() => {
      saved();
    });
    if (path) {
      await saveToPath(path);
    } else {
      requestedAction$.set('save');
      onGameCommand('pause:saves' as GameCommand);
    }
  });
  api.on('wait', (ms, finish) => {
    wait$.set({ ms, finish });
  });
});

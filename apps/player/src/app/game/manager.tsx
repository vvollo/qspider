import React, { useState } from 'react';
import { observable, action, makeObservable, runInAction } from 'mobx';
import { fetchPlayerConfig } from './loader';
import { QspAPI, init, QspErrorData, QspListItem, QspEvents } from '@qspider/qsp-wasm';
import { prepareContent, prepareList } from './helpers';
import { extractLayoutData, LayoutDock } from './cfg-converter';
import { DEFAULT_LAYOUT, DEFAULT_FLOATING } from './defaults';
import { SaveManager, SaveAction } from './save-manager';
import { QspGUIPanel } from '../constants';
import { CfgData } from './cfg-parser';
import { AudioEngine } from './audio-engine';
import { HotKeysManager } from './hotkeys';
import { ResourceManager, useResources } from './resource-manager';
import { GameDescriptor, PlayerConfig } from './contracts';
import { defer, hashString, resolvePath } from '../utils';

export class GameManager {
  config: PlayerConfig;
  currentGame: GameDescriptor;
  folder: string;
  gameConfig: CfgData | false;
  errorData: QspErrorData;
  isInitialized = false;
  isGameListShown = false;

  layout: LayoutDock[] = [];
  floating: [QspGUIPanel, number, number][];

  main = '';
  isNewLoc = false;
  newLocHash = '';
  stats = '';
  actions: QspListItem[] = [];
  objects: QspListItem[] = [];
  userInput = '';

  isMenuShown = false;
  menu: QspListItem[] = [];
  menuResult: (index: number) => void;

  isMsgShown = false;
  msg = '';
  onMsg: () => void;

  isInputShown = false;
  input = '';
  onInput: (text: string) => void;

  isViewShown = false;
  viewSrc = '';

  isWaiting = false;
  waitTimeout: ReturnType<typeof setTimeout>;
  onWait: () => void;

  saveAction: SaveAction | null = null;

  counterDelay = 500;
  counterTimeout: ReturnType<typeof setTimeout>;

  apiInitialized: Promise<void>;

  public readonly audioEngine = new AudioEngine();
  private saveManager = new SaveManager();
  private hotKeysManager = new HotKeysManager();

  constructor(private resources: ResourceManager) {
    makeObservable(this, {
      isInitialized: observable,
      isGameListShown: observable,
      currentGame: observable,

      main: observable,
      isNewLoc: observable,
      newLocHash: observable,
      stats: observable,
      actions: observable.ref,
      objects: observable.ref,
      userInput: observable,

      isMenuShown: observable,
      menu: observable.ref,
      updateMsg: action,
      closeMsg: action,

      isMsgShown: observable,
      msg: observable,

      isInputShown: observable,
      input: observable,
      updateInput: action,
      closeInput: action,

      isViewShown: observable,
      viewSrc: observable,
      updateView: action,
      closeView: action,

      isWaiting: observable,
      startWaiting: action,
      completeWaiting: action,

      saveAction: observable.ref,
      clearSaveAction: action,
      requestSave: action,
      requestRestore: action,

      markInitialized: action,
      showGameList: action,
      hideGameList: action,

      errorData: observable,
      updateErrorDescription: action,
      clearError: action,

      updateMain: action,
      updateStats: action,
      updateActions: action,
      updateObjects: action,
      updateUserInput: action,
      updateMenu: action,
      selectMenu: action,
    });
    this.apiInitialized = new Promise((resolve) => {
      this.initialize(resolve);
    });
  }

  private isPaused = false;
  private _api: QspAPI;
  get api() {
    return this._api;
  }

  async initialize(onApiInitialized: () => void): Promise<void> {
    this._api = await init();
    console.log(`QSP version: ${this._api.version()}`);

    this.setupQspCallbacks();
    this.setupHotKeyListeners();

    this.config = await fetchPlayerConfig();

    this.hotKeysManager.setupGlobalHotKeys();
    onApiInitialized();

    if (this.config.game.length > 1) {
      this.showGameList();
    } else {
      this.openGameDescriptor(this.config.game[0]);
    }

    this.markInitialized();
  }

  async openGame(source: ArrayBuffer, name: string) {
    try {
      const gameSource = await this.resources.openGame(source);
      if (gameSource) {
        if (this.isGameListShown) {
          this.hideGameList();
        }
        if (this.currentGame) {
          this.hotKeysManager.reset();
        }
        let aeroConfig: { width: number; height: number; title: string } | null;
        if (name.endsWith('aqsp')) {
          aeroConfig = await this.resources.getAeroConfig();
        }
        this.runGame(gameSource, {
          id: name,
          mode: name.endsWith('aqsp') ? 'aero' : 'classic',
          title: aeroConfig?.title || '',
          file: name,
          aero: aeroConfig
            ? {
                width: aeroConfig.width,
                height: aeroConfig.height,
              }
            : undefined,
        });
      }
    } catch (err) {
      console.error(err);
      this.updateMsg(err.message);
    }
  }

  async openGameDescriptor(descriptor: GameDescriptor) {
    if (this.isGameListShown) {
      this.hideGameList();
    }
    this.stopGame();
    const gameSource = await this.resources.loadGame(descriptor.file);

    this.runGame(gameSource, descriptor);
  }

  async runGame(gameSource: ArrayBuffer, descriptor: GameDescriptor) {
    const { title } = descriptor;
    document.title = title;

    this.gameConfig = await this.resources.getConfig();
    if (this.gameConfig) {
      const { layout, floating } = extractLayoutData(this.gameConfig);
      this.layout = layout;
      this.floating = floating;
    } else {
      this.layout = DEFAULT_LAYOUT;
      this.floating = DEFAULT_FLOATING;
    }

    runInAction(() => {
      this.currentGame = descriptor;
    });

    if (descriptor.hotkeys) {
      this.hotKeysManager.setupCustomHotKeys(descriptor.hotkeys);
    }
    await this.loadAdditionalResources(descriptor.resources);

    this._api.openGame(gameSource, true);
    this._api.restartGame();
  }

  async loadAdditionalResources(resources: GameDescriptor['resources']) {
    if (!resources) return;
    if (resources.styles) {
      await this.loadAdditionalStyles(resources.styles);
    }
    if (resources.scripts) {
      await this.loadAdditionalScripts(resources.scripts);
    }
    if (resources.fonts) {
      for (const font of resources.fonts) {
        this.loadAdditionalFont(font);
      }
    }
    if (resources.icon) {
      this.updateIcon(this.resources.get(resources.icon).url);
    }
  }

  async loadAdditionalStyles(styles: string[]) {
    const promises: Promise<void>[] = [];
    for (const style of styles) {
      const isExternal = style.startsWith('http');
      if (isExternal) {
        const gameStyle = document.createElement('link');
        gameStyle.rel = 'stylesheet';
        gameStyle.href = style;
        gameStyle.dataset.qspiderResource = 'style';
        const defered = defer<void>();
        gameStyle.onload = () => defered.resolve();
        gameStyle.onerror = () => defered.reject(new Error(`File not found: ${style}`));
        promises.push(defered.promise);
        document.head.appendChild(gameStyle);
      } else {
        const { url } = this.resources.get(style);
        const response = await fetch(url);
        const text = await response.text();
        const processed = text.replace(/url\(['"]?(.*?)['"]?\)/gim, (match, path) => {
          if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
            return `url("${path}")`;
          }
          const { url } = this.resources.get(resolvePath(style, path));
          return `url("${url}")`;
        });
        const gameStyle = document.createElement('style');
        gameStyle.innerText = processed;
        gameStyle.dataset.qspiderResource = 'style';
        document.head.appendChild(gameStyle);
      }
    }
    await Promise.allSettled(promises);
  }

  async loadAdditionalScripts(scripts: string[]) {
    const promises: Promise<void>[] = [];
    for (const script of scripts) {
      const gameScript = document.createElement('script');
      gameScript.type = 'text/javascript';
      gameScript.src = this.resources.get(script).url;
      gameScript.dataset.qspiderResource = 'script';
      const defered = defer<void>();
      gameScript.onload = () => defered.resolve();
      gameScript.onerror = () => defered.reject(new Error(`File not found: ${script}`));
      promises.push(defered.promise);
      document.head.appendChild(gameScript);
    }
    await Promise.allSettled(promises);
  }

  loadAdditionalFont(font: [string, string, string, string]) {
    const [name, path, weight, style] = font;
    const css = `
      @font-face {
        font-family: "${name}";
        src: url("${this.resources.get(path).url}");
        font-display: block;
        font-style: ${style || 'normal'};
        font-weight: ${weight || 'normal'};
      }
    `;
    const gameStyle = document.createElement('style');
    gameStyle.innerText = css;
    gameStyle.dataset.qspiderResource = 'style';
    document.head.appendChild(gameStyle);
  }

  updateIcon(favicon = 'favicon.ico'): void {
    (document.getElementById('favicon') as HTMLLinkElement).href = favicon;
  }

  clearAdditionalResources() {
    document.querySelectorAll('[data-qspider-resource]').forEach((el) => el.remove());
  }

  stopGame() {
    if (this.currentGame) {
      this.updateIcon();
      this.hotKeysManager.reset();
      this.resources.clear();
      this.clearAdditionalResources();
      this.currentGame = null;
      window.dispatchEvent(new Event('game-unload'));
    }
  }

  get hasGameList(): boolean {
    return this.config.game.length > 0;
  }

  showGameList() {
    this.isGameListShown = true;
  }

  hideGameList() {
    this.isGameListShown = false;
  }

  setupQspCallbacks(): void {
    this._api.on('error', this.updateErrorDescription);
    this._api.on('main_changed', this.updateMain);
    this._api.on('stats_changed', this.updateStats);
    this._api.on('actions_changed', this.updateActions);
    this._api.on('objects_changed', this.updateObjects);
    this._api.on('user_input', this.updateUserInput);
    this._api.on('menu', this.updateMenu);
    this._api.on('msg', this.updateMsg);
    this._api.on('input', this.updateInput);
    this._api.on('wait', this.startWaiting);
    this._api.on('timer', this.updateTimer);
    this._api.on('view', this.updateView);
    this._api.on('open_game', this.onOpenGame);
    this._api.on('save_game', this.onSaveGame);
    this._api.on('load_save', this.onLoadSave);
    this._api.on('is_play', this.isPlay);
    this._api.on('play_file', this.playFile);
    this._api.on('close_file', this.closeFile);
    this._api.on('system_cmd', this.processSystemCmd);
  }

  setupHotKeyListeners() {
    this.hotKeysManager.on('select_action', (index: number) => {
      if (this.isPaused) return;
      if (index >= 0 && index < this.actions.length) {
        this.selectAction(index);
        this.executeSelAction();
      }
    });
    this.hotKeysManager.on('select_single_action', () => {
      if (this.isPaused) return;
      if (this.actions.length === 1) {
        this.selectAction(0);
        this.executeSelAction();
      }
    });
    this.hotKeysManager.on('save', () => {
      if (this.isPaused) return;
      this.requestSave();
    });
    this.hotKeysManager.on('load', () => {
      if (this.isPaused) return;
      this.requestRestore();
    });
    this.hotKeysManager.on('restart', () => {
      if (this.isPaused) return;
      this.restart();
    });
    this.hotKeysManager.on('quicksave', () => {
      if (this.isPaused) return;
      this.quickSave();
    });
    this.hotKeysManager.on('quickload', () => {
      if (this.isPaused) return;
      this.quickLoad();
    });
    this.hotKeysManager.on('volume_up', () => {
      if (this.isPaused) return;
      this.audioEngine.increaseVolume();
    });
    this.hotKeysManager.on('volume_down', () => {
      if (this.isPaused) return;
      this.audioEngine.decreaseVolume();
    });
    this.hotKeysManager.on('unmute', () => {
      if (this.isPaused) return;
      this.audioEngine.unMute();
    });
    this.hotKeysManager.on('mute', () => {
      if (this.isPaused) return;
      this.audioEngine.mute();
    });
    this.hotKeysManager.on('exec_loc', (name) => {
      if (this.isPaused) return;
      this._api.execLoc(name);
    });
  }

  on<E extends keyof QspEvents>(event: E, listener: QspEvents[E]): void {
    this._api.on(event, listener);
  }

  restart(): void {
    this.pause();
    this._api.restartGame();
  }

  execCode(code: string): void {
    console.log('EXEC: ', code);
    this._api.execCode(code);
  }

  markInitialized(): void {
    this.isInitialized = true;
  }

  updateErrorDescription = (errorData: QspErrorData): void => {
    this.errorData = errorData;
  };
  clearError(): void {
    this.errorData = null;
  }

  updateMain = (text: string): void => {
    const prevMain = this.main;
    this.main = prepareContent(text);
    this.isNewLoc = !prevMain || (this.main !== prevMain && !this.main.startsWith(prevMain));
    if (this.isNewLoc) {
      this.newLocHash = String(hashString(this.main));
    }
  };
  updateStats = (text: string): void => {
    this.stats = prepareContent(text);
  };
  updateActions = (list: QspListItem[]): void => {
    this.actions = prepareList(list);
  };
  updateObjects = (list: QspListItem[]): void => {
    this.objects = prepareList(list);
  };
  updateMenu = (list: QspListItem[], result: (index: number) => void): void => {
    this.pause();
    this.menu = prepareList(list);
    this.menuResult = result;
    this.isMenuShown = true;
  };

  updateMsg = (text: string, onMsg?: () => void): void => {
    this.pause();
    this.msg = text;
    this.onMsg = onMsg;
    this.isMsgShown = true;
  };

  closeMsg = (): void => {
    this.isMsgShown = false;
    const onMsg = this.onMsg;
    this.onMsg = null;
    this.resume();
    if (onMsg) {
      onMsg();
    }
  };

  updateInput = (text: string, onInput: (text: string) => void): void => {
    this.pause();
    this.input = text;
    this.onInput = onInput;
    this.isInputShown = true;
  };

  closeInput = (text: string): void => {
    this.isInputShown = false;
    const onInput = this.onInput;
    this.onInput = null;
    this.resume();
    onInput(text);
  };

  updateUserInput = (text: string): void => {
    this.userInput = text;
  };

  submitUserInput = (): void => {
    this._api.execUserInput(this.userInput);
  };

  selectAction(index: number): void {
    this._api.selectAction(index);
  }

  executeSelAction(): void {
    this._api.executeSelAction();
  }

  selectObject(index: number): void {
    this._api.selectObject(index);
  }

  selectMenu(index: number): void {
    const menuResult = this.menuResult;
    this.isMenuShown = false;
    this.menuResult = null;
    this.resume();
    menuResult(index);
  }

  startWaiting = (ms: number, onComplete: () => void): void => {
    this.pause();
    clearTimeout(this.waitTimeout);
    this.isWaiting = true;
    this.onWait = onComplete;
    this.waitTimeout = setTimeout(() => {
      this.completeWaiting();
    }, ms);
  };

  completeWaiting = (): void => {
    clearTimeout(this.waitTimeout);
    if (this.isWaiting && this.onWait) {
      const onWait = this.onWait;
      this.onWait = null;
      this.isWaiting = false;
      this.resume();
      onWait();
    }
  };

  updateTimer = (ms: number): void => {
    this.counterDelay = ms;
    clearTimeout(this.counterTimeout);
    this.scheduleCounter();
  };

  scheduleCounter = (): void => {
    this.counterTimeout = setTimeout(() => {
      this._api.execCounter();
      this.scheduleCounter();
    }, this.counterDelay);
  };

  pause(): void {
    this.isPaused = true;
    clearTimeout(this.counterTimeout);
  }

  resume(): void {
    this.isPaused = false;
    this.scheduleCounter();
  }

  updateView = (path: string): void => {
    if (path) {
      this.viewSrc = this.resources.get(path).url;
      this.isViewShown = true;
    } else {
      this.closeView();
    }
  };

  closeView = (): void => {
    this.isViewShown = false;
    this.viewSrc = '';
  };

  onOpenGame = async (file: string, isNewGame: boolean, onOpened: () => void): Promise<void> => {
    this.pause();
    const gameSource = await this.resources.loadGame(file);
    this._api.openGame(gameSource, isNewGame);
    onOpened();
    this.resume();
  };

  onLoadSave = async (path: string, onLoaded: () => void): Promise<void> => {
    if (path) {
      this.pause();
      onLoaded();
      const saveData = await this.saveManager.loadByPath(this.currentGame.id, path);
      if (saveData) {
        this._api.loadSave(saveData);
      }
      this.resume();
    } else {
      this.requestRestore(onLoaded);
    }
  };

  onSaveGame = async (path: string, onSaved: () => void): Promise<void> => {
    if (path) {
      this.pause();
      const saveData = this._api.saveGame();
      await this.saveManager.saveByPath(this.currentGame.id, path, saveData);
      this.resume();
      onSaved();
    } else {
      this.requestSave(onSaved);
    }
  };

  isPlay = (path: string, onResult: (result: boolean) => void): void => {
    const isPlay = this.audioEngine.isPlaying(this.resources.get(path).url);
    onResult(isPlay);
  };

  closeFile = (path: string, onReady: () => void): void => {
    if (path) {
      this.audioEngine.close(this.resources.get(path).url);
    } else {
      this.audioEngine.closeAll();
    }
    onReady();
  };

  playFile = async (path: string, volume: number, onReady: () => void): Promise<void> => {
    this.audioEngine.play(this.resources.get(path), volume);
    onReady();
  };

  requestSave = async (onResult?: () => void): Promise<void> => {
    this.pause();
    const saveData = this._api.saveGame();
    if (saveData) {
      const slots = await this.saveManager.getSlots(this.currentGame.id);
      this.saveAction = {
        type: 'save',
        slots,
        data: saveData,
        callback: this.saveToSlot,
        onResult,
      };
    }
  };
  saveToSlot = async (slot: number): Promise<void> => {
    if (this.saveAction.type === 'save') {
      await this.saveManager.updateSlot(this.currentGame.id, slot, this.saveAction.data);
    }
    this.clearSaveAction();
  };

  async quickSave() {
    this.pause();
    const saveData = this._api.saveGame();
    await this.saveManager.quickSave(this.currentGame.id, saveData);
    this.resume();
  }

  requestRestore = async (onResult?: () => void): Promise<void> => {
    this.pause();
    const slots = await this.saveManager.getSlots(this.currentGame.id);
    this.saveAction = {
      type: 'restore',
      slots,
      callback: this.restoreFromSlot,
      onResult,
    };
  };

  restoreFromSlot = async (slot: number): Promise<void> => {
    const saveData = await this.saveManager.getSlotData(this.currentGame.id, slot);
    if (this.saveAction.onResult) {
      this.saveAction.onResult();
    }
    this.saveAction.onResult = null;
    if (saveData) {
      this._api.loadSave(saveData);
    }
    this.clearSaveAction();
  };

  async quickLoad() {
    this.pause();
    const saveData = await this.saveManager.quickLoad(this.currentGame.id);
    if (saveData) {
      this._api.loadSave(saveData);
    }
    this.resume();
  }

  clearSaveAction = (): void => {
    if (this.saveAction.onResult) {
      this.saveAction.onResult();
    }
    this.saveAction = null;
    this.resume();
  };
  processSystemCmd = (cmd: string) => {
    if (!cmd.startsWith('qspider')) return;
    const [, _cmd] = cmd.split('.');
    if (_cmd.startsWith('event:')) {
      const [, event] = _cmd.split(':');
      const match = event.trim().match(/(.*?)(\[(.*?)\])/i);
      if (match) {
        const name = match[1];
        const args = match[3].split(',').map((arg) => {
          const prepared = arg.trim();
          if (prepared.startsWith('"') || prepared.startsWith("'")) {
            return prepared.replace(/['"](.*?)['"]/gim, (_, path) => path);
          }
          return parseInt(prepared);
        });
        window.dispatchEvent(
          new CustomEvent('qspider-event', {
            detail: { name, args },
          })
        );
      } else {
        window.dispatchEvent(
          new CustomEvent('qspider-event', {
            detail: { name: event.trim() },
          })
        );
      }
    }
  };
}

const gameManagerContext = React.createContext<GameManager | null>(null);

export const GameManagerProvider: React.FC = ({ children }) => {
  const resources = useResources();
  const [manager] = useState(() => new GameManager(resources));
  return <gameManagerContext.Provider value={manager}>{children}</gameManagerContext.Provider>;
};

export const useGameManager = (): GameManager => {
  const manager = React.useContext(gameManagerContext);
  if (!manager) {
    // this is especially useful in TypeScript so you don't need to be checking for null all the time
    throw new Error('useStore must be used within a StoreProvider.');
  }
  return manager;
};
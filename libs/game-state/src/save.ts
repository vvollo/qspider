import { SaveData } from '@qspider/contracts';
import { create } from 'xoid';
import { withCounterPaused } from './counter';
import { currentGameEntry$, onRestore } from './current-game';
import { qspApi$ } from './qsp-api';
import { getStorage } from '@qspider/env';
import { closePauseScreen } from './pause-screen';

export const saveLoadedCallback$ = create<null | (() => void)>();
export const gameSavedCallback$ = create<null | (() => void)>();
export const saveSlots$ = create<SaveData[]>([]);
export const namedSlots$ = create<SaveData[]>([]);
export const requestedAction$ = create<string | null>(null);

export const QUICK_SAVE_KEY = '__quicksave_qspider__';

export async function loadSaveList(): Promise<void> {
  const currentGame = currentGameEntry$.value;
  if (!currentGame) {
    saveSlots$.set([]);
    namedSlots$.set([]);
    return;
  }
  const slots = await getStorage().getSavedSlots(currentGame.id);
  saveSlots$.set(slots || []);
  const named = await getStorage().getNamedSaves(currentGame.id);
  namedSlots$.set(named || []);
}

export async function saveToSlot(slot: number): Promise<void> {
  const currentGame = currentGameEntry$.value;
  if (!currentGame) return;
  const saveData = qspApi$.value?.saveGame();
  if (saveData) {
    await getStorage().saveBySlot(currentGame.id, slot, saveData);
  }
  const saved = gameSavedCallback$.value;
  saved?.();
  gameSavedCallback$.set(null);
  requestedAction$.set(null);
  await loadSaveList();
}

export async function saveToPath(path: string): Promise<void> {
  const currentGame = currentGameEntry$.value;
  if (!currentGame) return;
  const saveData = qspApi$.value?.saveGame();
  if (saveData) {
    await getStorage().saveByKey(currentGame.id, path, saveData);
  }
  const saved = gameSavedCallback$.value;
  saved?.();
  gameSavedCallback$.set(null);
  requestedAction$.set(null);
  await loadSaveList();
}

export async function restoreFromSlot(slot: number): Promise<void> {
  const currentGame = currentGameEntry$.value;
  if (!currentGame) return;
  const saveData = await getStorage().getSaveDataBySlot(currentGame.id, slot);
  const loaded = saveLoadedCallback$.value;
  loaded?.();
  saveLoadedCallback$.set(null);
  requestedAction$.set(null);
  if (saveData) {
    qspApi$.value?.loadSave(saveData);
  }
}

export async function restoreFromPath(path: string): Promise<void> {
  const currentGame = currentGameEntry$.value;
  if (!currentGame) return;
  const saveData = await getStorage().getSaveDataByKey(currentGame.id, path);
  const loaded = saveLoadedCallback$.value;
  loaded?.();
  saveLoadedCallback$.set(null);
  requestedAction$.set(null);
  if (saveData) {
    qspApi$.value?.loadSave(saveData);
  }
}

export async function clearSlot(slot: number): Promise<void> {
  const currentGame = currentGameEntry$.value;
  if (!currentGame) return;
  await getStorage().clearSaveSlot(currentGame.id, slot);
  await loadSaveList();
}

export async function clearPath(path: string): Promise<void> {
  const currentGame = currentGameEntry$.value;
  if (!currentGame) return;
  await getStorage().clearSaveKey(currentGame.id, path);
  await loadSaveList();
}

export async function quickSave(): Promise<void> {
  const nosave = qspApi$.value?.readVariable('NOSAVE');
  if (nosave) return;
  const currentGame = currentGameEntry$.value;
  if (!currentGame) return;
  await withCounterPaused(async () => {
    const saveData = qspApi$.value?.saveGame();
    if (!saveData) return;
    await getStorage().saveByKey(currentGame.id, QUICK_SAVE_KEY, saveData);
  });
}

export async function quickLoad(): Promise<void> {
  const currentGame = currentGameEntry$.value;
  if (!currentGame) return;
  await withCounterPaused(async () => {
    const saveData = await getStorage().getSaveDataByKey(currentGame.id, QUICK_SAVE_KEY);
    if (saveData) {
      qspApi$.value?.loadSave(saveData);
      onRestore();
    }
  });
}

export type QspSaveCommand = 'load' | 'save' | 'clear';
export type SaveContext = { slot_index: number; save_path: string };
export async function onSaveCommand(action: QspSaveCommand, context: SaveContext): Promise<void> {
  const { slot_index, save_path } = context;
  switch (action) {
    case 'load':
      if (slot_index > 0) {
        await restoreFromSlot(slot_index);
      } else if (save_path) {
        await restoreFromPath(save_path);
      }
      onRestore();
      closePauseScreen();
      break;
    case 'save':
      if (slot_index > 0) {
        await saveToSlot(slot_index);
      } else if (save_path) {
        await saveToPath(save_path);
      }
      closePauseScreen();
      break;
    case 'clear':
      if (slot_index > 0) {
        clearSlot(slot_index);
      } else if (save_path) {
        clearPath(save_path);
      }
      break;
    default:
      console.error(`Unknown save action: ${action}`);
  }
}

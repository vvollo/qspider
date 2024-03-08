import { games$, goToGame } from '@qspider/game-shelf';
import { importFile, showError } from '@qspider/game-state';
import { ChangeEvent, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export const OpenGameButton: React.FC = () => {
  const { t } = useTranslation();
  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (evt): Promise<void> {
      const content = evt.target?.result as ArrayBuffer;
      try {
        const imported = await importFile(file.name, content);
        for (const entry of imported) {
          games$.actions.add(entry.id, entry);
        }
        const toRun = imported[0].id;
        toRun && goToGame(toRun);
      } catch (err) {
        showError(err instanceof Error ? err.message : String(err));
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);
  return (
    <label className="q-button q-open-game-button" htmlFor="openGame">
      {t('Open game')}
      <input type="file" id="openGame" accept=".zip, .aqsp, .qsp, .qsps, .rar, .7z" onChange={onChange} />
    </label>
  );
};

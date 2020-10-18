import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import styled from '@emotion/styled';
import { useGameManager } from '../../../game/manager';
import { Modal } from '../../ui-blocks/modal';
import { WithTheme } from '../../../theme.types';
import { config } from 'localforage';

const GameSlots = styled.div<{ even: boolean }>`
  padding: 16px;
  display: grid;
  grid-template-columns: ${(props) => (props.even ? '1fr 1fr' : '1fr 1fr 1fr')};
  column-gap: 16px;
  row-gap: 16px;
`;

const GameSlot = styled.div<WithTheme>`
  border: 1px solid ${(props) => props.theme.borderColor};
  color: ${(props) => props.theme.textColor};
  padding: 16px;
  border-radius: 4px;
  white-space: pre-wrap;
  cursor: pointer;
`;

const GameTitle = styled.h3`
  margin: 0;
  text-align: center;
`;

export const GameListDialog: React.FC<{ closable?: boolean }> = observer(({ closable }) => {
  const gameManager = useGameManager();
  const onClose = useCallback(() => gameManager.hideGameList(), [gameManager]);
  const { config, isGameListShown } = gameManager;
  const isShown = Boolean(isGameListShown);
  if (!isShown) return null;
  return (
    <Modal closable={closable} onClose={onClose} hideButtons width={800}>
      <GameSlots even={!(config.game.length % 2)}>
        {config.game.map((game) => (
          <GameSlot key={game.id} onClick={() => gameManager.runGame(game)}>
            <GameTitle>{game.title}</GameTitle>
            {game.description && <p>{game.description}</p>}
          </GameSlot>
        ))}
      </GameSlots>
    </Modal>
  );
});

import React from 'react';
import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useGameManager } from '../../game/manager';
import { IconButton } from '../ui-blocks/icon-button';
import { OpenGameButton } from '../ui-blocks/open-game-button';
import { useLayout } from '../../game/layout';
import { IconType } from '@qspider/icons';

export const PlayerToolbarWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 10px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 26px;
`;

const Icons = styled.div`
  display: flex;

  & > button,
  & > div {
    margin-left: 5px;
  }
`;

export const PlayerToolbar: React.FC = observer(() => {
  const manager = useGameManager();
  const layout = useLayout();
  return (
    <PlayerToolbarWrapper>
      <Title>{manager.currentGame?.title || ''}</Title>
      <Icons>
        <IconButton
          icon={manager.audioEngine.isMuted ? IconType.speakerOff : IconType.speaker}
          onClick={(): void => {
            if (manager.audioEngine.isMuted) {
              manager.audioEngine.unMute();
            } else {
              manager.audioEngine.mute();
            }
          }}
        />
        <IconButton icon={IconType.restart} onClick={(): void => manager.restart()} />
        {!layout.nosave && <IconButton icon={IconType.save} onClick={(): Promise<void> => manager.requestSave()} />}
        {!layout.nosave && <IconButton icon={IconType.load} onClick={(): Promise<void> => manager.requestRestore()} />}
        {manager.hasGameList ? <IconButton icon={IconType.list} onClick={(): void => manager.showGameList()} /> : null}
        <OpenGameButton />
      </Icons>
    </PlayerToolbarWrapper>
  );
});

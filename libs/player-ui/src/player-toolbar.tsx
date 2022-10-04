import React from 'react';
import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { IconType } from '@qspider/icons';
import { useComponents, useGameManager } from '@qspider/providers';
import { IconButton, hooks } from '@qspider/components';

export const PlayerToolbarWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 10px;
  max-height: 100%;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 26px;
  text-overflow: ellipsis;
  overflow: hidden;
  max-height: 100%;
  display: inline-block;
  white-space: nowrap;
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
  const { OpenGameButton } = useComponents();
  const nosave = hooks.useQspVariable('NOSAVE', 0);
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
        {!nosave && <IconButton icon={IconType.save} onClick={(): Promise<void> => manager.requestSave()} />}
        {!nosave && <IconButton icon={IconType.load} onClick={(): Promise<void> => manager.requestRestore()} />}
        {manager.hasGameList ? <IconButton icon={IconType.list} onClick={(): void => manager.showGameList()} /> : null}
        <OpenGameButton />
      </Icons>
    </PlayerToolbarWrapper>
  );
});

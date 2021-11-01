import styled from '@emotion/styled';
import Color from 'color';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useGameManager } from '../game/manager';
import { AeroPlayer } from './aero/aero-player';
import { Player } from './player';

export const PlayerStyles = styled.div`
  font-size: ${(props): number => props.theme.fontSize}px;
  --font-size: ${(props): number => props.theme.fontSize}px;
  font-name: ${(props): string => props.theme.fontName};
  --background-color: ${(props): string => props.theme.backgroundColor};
  --inverted-background-color: ${(props): string => Color(props.theme.backgroundColor).negate().hex()};
  --background-image: ${(props): string => props.theme.backgroundImage};
  color: ${(props): string => props.theme.textColor};
  --color: ${(props): string => props.theme.textColor};
  --inverted-color: ${(props): string => props.theme.backgroundColor};
  --link-color: ${(props): string => props.theme.linkColor};
  --border-color: ${(props): string => props.theme.borderColor};
  --inverted-border-color: ${(props): string => Color(props.theme.borderColor).negate().hex()};

  button {
    color: ${(props): string => props.theme.textColor};
    font-size: ${(props): number => props.theme.fontSize}px;
    font-name: ${(props): string => props.theme.fontName};
  }

  input {
    color: ${(props): string => props.theme.textColor};
    font-size: ${(props): number => props.theme.fontSize}px;
    font-name: ${(props): string => props.theme.fontName};
  }
`;

export const PlayerMode: React.FC = observer(() => {
  const manager = useGameManager();
  if (!manager.currentGame) return null;
  return <PlayerStyles>{manager.currentGame.mode === 'aero' ? <AeroPlayer /> : <Player />}</PlayerStyles>;
});

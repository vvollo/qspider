import React, { useRef, useEffect } from 'react';
import { Global, css } from '@emotion/react';
import { BaseLayoutProvider, ComponentsProvider, GameManagerProvider, ResourceProvider } from '@qspider/providers';
import { ResourceManager } from '@qspider/resources';
import { BaseLayout, GameManager, Theme } from '@qspider/core';
import { Game, GameListDialog, ToolsDialog } from '@qspider/player-ui';
import { ProvidedComponents } from '@qspider/contracts';
import { OpenGameButton } from './open-game-button';
import { windowManager } from './window-manager';
import { PlayerMode } from './player-mode';
import { cyrb53 } from '@qspider/utils';

export const App: React.FC = () => {
  const resources = useRef(new ResourceManager());
  const manager = useRef(new GameManager(resources.current, windowManager));
  const layout = useRef(new BaseLayout(manager.current, resources.current));
  const components = useRef({
    [ProvidedComponents.OpenGameButton]: OpenGameButton,
  });

  useEffect(() => {
    const init = async (): Promise<void> => {
      await manager.current.initialize();

      const queryString = window.location.search;
      const urlParams = new URLSearchParams(queryString);
      const configUrl = urlParams.get('config');
      const gameUrl = urlParams.get('game');
      if (configUrl) {
        manager.current.runConfig(configUrl);
      } else if (gameUrl) {
        manager.current.openGameDescriptor(
          {
            id: cyrb53(gameUrl),
            mode: gameUrl.endsWith('aqsp') ? 'aero' : 'classic',
            title: '',
            file: gameUrl,
          },
          false
        );
      } else {
        manager.current.runConfig();
      }
    };
    init();
  }, []);

  return (
    <ComponentsProvider value={components.current}>
      <ResourceProvider value={resources.current}>
        <GameManagerProvider value={manager.current}>
          <BaseLayoutProvider value={layout.current}>
            <Theme>
              <Global
                styles={css`
                  body {
                    margin: 0;
                  }
                  *,
                  *:before,
                  *:after {
                    box-sizing: border-box;
                  }
                `}
              />
              <Game>
                <PlayerMode />
                <GameListDialog closable={true} />
                <ToolsDialog />
              </Game>
            </Theme>
          </BaseLayoutProvider>
        </GameManagerProvider>
      </ResourceProvider>
    </ComponentsProvider>
  );
};

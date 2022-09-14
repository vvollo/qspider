import React from 'react';
import { observer } from 'mobx-react-lite';
import { AeroActionsPanel } from './aero-actions';
import { AeroCustomScroll } from '../aero-custom-scroll';
import { AeroEffect } from '../effects/aero-effect';
import { useGameManager, useResources } from '@qspider/providers';
import { TEXT_PLACEHOLDER, useAeroLayout } from '../aero-layout';
import { AeroPanel } from '../aero-panel';
import { Content } from '@qspider/components';

export const AeroMainPanel: React.FC = observer(() => {
  const manager = useGameManager();
  const resources = useResources();
  const layout = useAeroLayout();
  if (!layout.mainUI) return null;
  const content = layout.mainUI.format.replace(TEXT_PLACEHOLDER, manager.main);
  return (
    <AeroEffect
      animationKey={manager.newLocHash}
      show
      effect={layout.playerUI.newLocEffect.name}
      duration={layout.playerUI.newLocEffect.time}
      sequence={layout.playerUI.sequenceNewLocEffect}
    >
      <AeroPanel
        {...layout.mainUI}
        background={layout.mainUI.backImage && resources.get(layout.mainUI.backImage).url}
        data-type="main"
      >
        <AeroCustomScroll scrollY={manager.isNewLoc ? undefined : '100%'}>
          <Content content={content} />
          {layout.playerUI.intergratedActions && <AeroActionsPanel />}
        </AeroCustomScroll>
      </AeroPanel>
    </AeroEffect>
  );
});

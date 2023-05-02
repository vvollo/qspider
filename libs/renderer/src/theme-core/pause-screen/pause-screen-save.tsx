import { Attributes, isPauseScreenVisible$, saveToSlot } from '@qspider/game-state';
import * as Tabs from '@radix-ui/react-tabs';
import { ReactNode } from 'react';
import { useAttributes } from '../../content/attributes';
import { slotActionContext } from './slots';

export const QspPauseScreenSave: React.FC<{ attrs: Attributes; children: ReactNode }> = ({ attrs, children }) => {
  const [Tag, style, attributes] = useAttributes(attrs, 'qsp-pause-screen-save');
  const action = async (index: number): Promise<void> => {
    await saveToSlot(index);
    isPauseScreenVisible$.set(false);
  };
  return (
    <slotActionContext.Provider value={{ action, disableEmpty: false }}>
      <Tabs.Content value="save">
        <Tag style={style} {...attributes}>
          {children}
        </Tag>
      </Tabs.Content>
    </slotActionContext.Provider>
  );
};

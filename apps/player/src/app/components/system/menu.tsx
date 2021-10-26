import React, { useCallback, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useGameManager } from '../../game/manager';
import { useClickCoordinates } from '../../hooks/click-coordinates';
import { ActionList } from '../ui-blocks/action-list/action-list';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { usePopper } from 'react-popper';
import styled from '@emotion/styled';
import { noop } from '../../utils';

export const MenuWrapper = styled.div`
  border: 1px solid var(--border-color);
`;

function generateGetBoundingClientRect(x = 0, y = 0) {
  return () => ({
    width: 0,
    height: 0,
    top: y,
    right: x,
    bottom: y,
    left: x,
  });
}

export const Menu: React.FC = observer(() => {
  const manager = useGameManager();
  const coordinates = useClickCoordinates();
  const [virtualElement, setVirtualElement] = React.useState({
    getBoundingClientRect: generateGetBoundingClientRect(),
  });
  useEffect(() => {
    setVirtualElement({
      getBoundingClientRect: generateGetBoundingClientRect(coordinates.x, coordinates.y),
    });
  }, [coordinates]);
  const [popperElement, setPopperElement] = React.useState(null);
  const node = useOutsideClick(() => manager.selectMenu(-1));
  const { styles, attributes } = usePopper(virtualElement, popperElement);

  const onMenuSelect = useCallback((index: number) => manager.selectMenu(index), [manager]);
  if (!manager.isMenuShown) return null;

  return (
    <div ref={setPopperElement} style={styles.popper} {...attributes.popper}>
      <MenuWrapper ref={node} data-qsp="menu">
        <ActionList actions={manager.menu} onSelect={noop} onAction={onMenuSelect} dataQsp="menu-list" />
      </MenuWrapper>
    </div>
  );
});

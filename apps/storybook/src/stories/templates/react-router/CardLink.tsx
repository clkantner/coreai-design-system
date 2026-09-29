import * as React from 'react';
import { Card as CoreAICard, type CardProps as CoreAICardProps } from '@coreai/fluentui-react';
import type { LinkProps as RouterLinkProps } from 'react-router-dom';
import { useRouterLinkSlot } from './RouterLinkSlots';

export type CardLinkProps = Omit<CoreAICardProps, keyof RouterLinkProps | 'as'> & RouterLinkProps;

export const CardLink = React.forwardRef<HTMLAnchorElement, CardLinkProps>((props, ref) => {
  const [RouterLinkSlot, cardProps] = useRouterLinkSlot(props);

  return (
    <CoreAICard
      {...(cardProps as CoreAICardProps)}
      role={cardProps.role ?? 'link'}
      as={RouterLinkSlot as unknown as 'div'}
      ref={ref as unknown as React.Ref<HTMLDivElement>}
    />
  );
});

CardLink.displayName = 'CardLink';

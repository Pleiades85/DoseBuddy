import React from 'react';

const typographyStyles = {
  h1: { fontSize: 'var(--text-4xl)', fontWeight: 800, lineHeight: 'var(--leading-tight)', color: 'var(--text)', margin: 0 },
  h2: { fontSize: 'var(--text-2xl)', fontWeight: 700, lineHeight: 'var(--leading-tight)', color: 'var(--text)', margin: 0 },
  h3: { fontSize: 'var(--text-xl)', fontWeight: 600, lineHeight: 'var(--leading-tight)', color: 'var(--text)', margin: 0 },
  h4: { fontSize: 'var(--text-lg)', fontWeight: 600, lineHeight: 'var(--leading-tight)', color: 'var(--text)', margin: 0 },
  body: { fontSize: 'var(--text-base)', fontWeight: 400, lineHeight: 'var(--leading-normal)', color: 'var(--text)', margin: 0 },
  bodySmall: { fontSize: 'var(--text-sm)', fontWeight: 400, lineHeight: 'var(--leading-normal)', color: 'var(--text)', margin: 0 },
  caption: { fontSize: 'var(--text-xs)', fontWeight: 500, lineHeight: 'var(--leading-normal)', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  label: { fontSize: 'var(--text-sm)', fontWeight: 500, lineHeight: 'var(--leading-normal)', color: 'var(--text-secondary)', margin: 0 },
};

const createTypography = (variant, tag) => {
  const Component = ({ children, style, className = '', color, ...props }) => {
    const Tag = tag;
    return (
      <Tag
        className={className}
        style={{ ...typographyStyles[variant], ...(color ? { color } : {}), ...style }}
        {...props}
      >
        {children}
      </Tag>
    );
  };
  Component.displayName = variant.charAt(0).toUpperCase() + variant.slice(1);
  return Component;
};

export const H1 = createTypography('h1', 'h1');
export const H2 = createTypography('h2', 'h2');
export const H3 = createTypography('h3', 'h3');
export const H4 = createTypography('h4', 'h4');
export const Body = createTypography('body', 'p');
export const BodySmall = createTypography('bodySmall', 'p');
export const Caption = createTypography('caption', 'span');
export const Label = createTypography('label', 'label');

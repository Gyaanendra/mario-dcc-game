import React from 'react';

// 8-bit Pixel Avatar: Mario
export const MarioSprite: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`pixelated ${className}`}>
    {/* Red Hat & Shirt */}
    <rect x="3" y="1" width="5" height="1" fill="#E52521" />
    <rect x="2" y="2" width="9" height="1" fill="#E52521" />
    <rect x="2" y="3" width="3" height="1" fill="#794000" />
    <rect x="5" y="3" width="2" height="1" fill="#FCD8A8" />
    <rect x="7" y="3" width="1" height="1" fill="#000" />
    <rect x="8" y="3" width="1" height="1" fill="#FCD8A8" />
    <rect x="1" y="4" width="1" height="1" fill="#794000" />
    <rect x="2" y="4" width="1" height="1" fill="#FCD8A8" />
    <rect x="3" y="4" width="1" height="1" fill="#794000" />
    <rect x="4" y="4" width="3" height="1" fill="#FCD8A8" />
    <rect x="7" y="4" width="1" height="1" fill="#000" />
    <rect x="8" y="4" width="3" height="1" fill="#FCD8A8" />
    <rect x="1" y="5" width="1" height="1" fill="#794000" />
    <rect x="2" y="5" width="1" height="1" fill="#FCD8A8" />
    <rect x="3" y="5" width="2" height="1" fill="#794000" />
    <rect x="5" y="5" width="3" height="1" fill="#FCD8A8" />
    <rect x="8" y="5" width="4" height="1" fill="#794000" />
    <rect x="1" y="6" width="2" height="1" fill="#794000" />
    <rect x="3" y="6" width="6" height="1" fill="#FCD8A8" />
    {/* Red Body & Blue Overalls */}
    <rect x="2" y="7" width="2" height="1" fill="#E52521" />
    <rect x="4" y="7" width="1" height="1" fill="#0022AA" />
    <rect x="5" y="7" width="2" height="1" fill="#E52521" />
    <rect x="7" y="7" width="1" height="1" fill="#0022AA" />
    <rect x="8" y="7" width="2" height="1" fill="#E52521" />
    <rect x="1" y="8" width="3" height="1" fill="#E52521" />
    <rect x="4" y="8" width="1" height="1" fill="#0022AA" />
    <rect x="5" y="8" width="2" height="1" fill="#E52521" />
    <rect x="7" y="8" width="1" height="1" fill="#0022AA" />
    <rect x="8" y="8" width="3" height="1" fill="#E52521" />
    <rect x="0" y="9" width="4" height="1" fill="#E52521" />
    <rect x="4" y="9" width="4" height="1" fill="#0022AA" />
    <rect x="8" y="9" width="4" height="1" fill="#E52521" />
    {/* Hands & Overalls */}
    <rect x="0" y="10" width="2" height="1" fill="#FCD8A8" />
    <rect x="2" y="10" width="1" height="1" fill="#E52521" />
    <rect x="3" y="10" width="1" height="1" fill="#0022AA" />
    <rect x="4" y="10" width="1" height="1" fill="#FBD000" />
    <rect x="5" y="10" width="2" height="1" fill="#0022AA" />
    <rect x="7" y="10" width="1" height="1" fill="#FBD000" />
    <rect x="8" y="10" width="1" height="1" fill="#0022AA" />
    <rect x="9" y="10" width="1" height="1" fill="#E52521" />
    <rect x="10" y="10" width="2" height="1" fill="#FCD8A8" />
    <rect x="0" y="11" width="3" height="1" fill="#FCD8A8" />
    <rect x="3" y="11" width="6" height="1" fill="#0022AA" />
    <rect x="9" y="11" width="3" height="1" fill="#FCD8A8" />
    {/* Pants & Shoes */}
    <rect x="3" y="12" width="6" height="1" fill="#0022AA" />
    <rect x="2" y="13" width="3" height="1" fill="#794000" />
    <rect x="7" y="13" width="3" height="1" fill="#794000" />
    <rect x="1" y="14" width="4" height="1" fill="#794000" />
    <rect x="7" y="14" width="4" height="1" fill="#794000" />
  </svg>
);

// 8-bit Pixel Avatar: Luigi
export const LuigiSprite: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`pixelated ${className}`}>
    <rect x="3" y="1" width="5" height="1" fill="#00A800" />
    <rect x="2" y="2" width="9" height="1" fill="#00A800" />
    <rect x="2" y="3" width="3" height="1" fill="#004D00" />
    <rect x="5" y="3" width="2" height="1" fill="#FCD8A8" />
    <rect x="7" y="3" width="1" height="1" fill="#000" />
    <rect x="8" y="3" width="1" height="1" fill="#FCD8A8" />
    <rect x="2" y="4" width="6" height="1" fill="#FCD8A8" />
    <rect x="2" y="7" width="2" height="1" fill="#00A800" />
    <rect x="4" y="7" width="1" height="1" fill="#0022AA" />
    <rect x="5" y="7" width="2" height="1" fill="#00A800" />
    <rect x="7" y="7" width="1" height="1" fill="#0022AA" />
    <rect x="8" y="7" width="2" height="1" fill="#00A800" />
    <rect x="3" y="10" width="6" height="3" fill="#0022AA" />
    <rect x="2" y="13" width="3" height="2" fill="#794000" />
    <rect x="7" y="13" width="3" height="2" fill="#794000" />
  </svg>
);

// 8-bit Question Block
export const QuestionBlock: React.FC<{ size?: number; className?: string; isHit?: boolean }> = ({
  size = 48,
  className = '',
  isHit = false
}) => (
  <div
    style={{ width: size, height: size }}
    className={`inline-block select-none relative transition-transform duration-100 ${
      isHit ? '-translate-y-2' : ''
    } ${className}`}
  >
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="pixelated drop-shadow-md">
      {/* Outer Border */}
      <rect width="16" height="16" fill="#000" />
      <rect x="1" y="1" width="14" height="14" fill={isHit ? '#8B5A2B' : '#E87D00'} />
      {/* Top/Left Highlight */}
      <rect x="1" y="1" width="14" height="1" fill={isHit ? '#A06E3B' : '#FCD8A8'} />
      <rect x="1" y="1" width="1" height="14" fill={isHit ? '#A06E3B' : '#FCD8A8'} />
      {/* Bottom/Right Shadow */}
      <rect x="1" y="14" width="14" height="1" fill={isHit ? '#5C381E' : '#794000'} />
      <rect x="14" y="1" width="1" height="14" fill={isHit ? '#5C381E' : '#794000'} />
      {/* 4 Corner Screws */}
      <rect x="2" y="2" width="1" height="1" fill="#000" />
      <rect x="13" y="2" width="1" height="1" fill="#000" />
      <rect x="2" y="13" width="1" height="1" fill="#000" />
      <rect x="13" y="13" width="1" height="1" fill="#000" />
      {/* Question Mark or Empty Face */}
      {!isHit ? (
        <>
          <rect x="5" y="3" width="6" height="2" fill="#000" />
          <rect x="4" y="4" width="2" height="3" fill="#000" />
          <rect x="10" y="4" width="2" height="4" fill="#000" />
          <rect x="8" y="7" width="3" height="3" fill="#000" />
          <rect x="8" y="11" width="2" height="2" fill="#000" />

          {/* Inner Question Mark (White) */}
          <rect x="6" y="4" width="4" height="1" fill="#FFF" />
          <rect x="9" y="5" width="2" height="2" fill="#FFF" />
          <rect x="7" y="7" width="2" height="2" fill="#FFF" />
          <rect x="7" y="11" width="2" height="2" fill="#FFF" />
        </>
      ) : (
        <rect x="4" y="4" width="8" height="8" fill="#5C381E" />
      )}
    </svg>
  </div>
);

// 8-bit Spinning Coin
export const CoinSprite: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`pixelated ${className}`}>
    <rect x="4" y="1" width="8" height="1" fill="#000" />
    <rect x="2" y="2" width="2" height="1" fill="#000" />
    <rect x="12" y="2" width="2" height="1" fill="#000" />
    <rect x="1" y="4" width="1" height="8" fill="#000" />
    <rect x="14" y="4" width="1" height="8" fill="#000" />
    <rect x="2" y="13" width="2" height="1" fill="#000" />
    <rect x="12" y="13" width="2" height="1" fill="#000" />
    <rect x="4" y="14" width="8" height="1" fill="#000" />

    {/* Gold Fill */}
    <rect x="4" y="2" width="8" height="12" fill="#FBD000" />
    <rect x="2" y="3" width="12" height="10" fill="#FBD000" />
    {/* Highlight */}
    <rect x="4" y="3" width="2" height="10" fill="#FFF" />
    {/* Inner shadow line */}
    <rect x="10" y="3" width="2" height="10" fill="#D09800" />
  </svg>
);

// 8-bit Red Flag / Ghost (Boo style)
export const RedFlagGhost: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`pixelated ${className}`}>
    <rect x="4" y="2" width="8" height="1" fill="#000" />
    <rect x="2" y="3" width="12" height="1" fill="#000" />
    <rect x="1" y="4" width="14" height="8" fill="#FFF" />
    <rect x="0" y="5" width="1" height="6" fill="#000" />
    <rect x="15" y="5" width="1" height="6" fill="#000" />
    {/* Angry Red Flag Eyes & Tongue */}
    <rect x="3" y="6" width="3" height="2" fill="#E52521" />
    <rect x="9" y="6" width="3" height="2" fill="#E52521" />
    <rect x="5" y="10" width="5" height="2" fill="#000" />
    <rect x="7" y="11" width="3" height="2" fill="#E52521" />
    {/* Bottom ruffle */}
    <rect x="2" y="12" width="12" height="2" fill="#000" />
  </svg>
);

// 8-bit Bowser / Final Boss
export const BowserBossSprite: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`pixelated ${className}`}>
    {/* Menacing Horns */}
    <rect x="4" y="2" width="2" height="3" fill="#E52521" />
    <rect x="18" y="2" width="2" height="3" fill="#E52521" />
    {/* Green Head / Spikes */}
    <rect x="6" y="4" width="12" height="6" fill="#00A800" />
    <rect x="7" y="3" width="10" height="2" fill="#E52521" />
    {/* Fiery Eyes */}
    <rect x="7" y="7" width="2" height="2" fill="#E52521" />
    <rect x="15" y="7" width="2" height="2" fill="#E52521" />
    <rect x="8" y="7" width="1" height="1" fill="#FFF" />
    <rect x="16" y="7" width="1" height="1" fill="#FFF" />
    {/* Sharp Jaws & Snout */}
    <rect x="6" y="10" width="12" height="5" fill="#FCD8A8" />
    <rect x="8" y="11" width="2" height="2" fill="#000" />
    <rect x="14" y="11" width="2" height="2" fill="#000" />
    {/* Teeth */}
    <rect x="7" y="13" width="1" height="2" fill="#FFF" />
    <rect x="11" y="13" width="2" height="2" fill="#FFF" />
    <rect x="16" y="13" width="1" height="2" fill="#FFF" />
    {/* Spiked Shell & Body */}
    <rect x="4" y="15" width="16" height="6" fill="#004D00" />
    <rect x="2" y="16" width="3" height="3" fill="#FFF" />
    <rect x="19" y="16" width="3" height="3" fill="#FFF" />
    <rect x="6" y="21" width="4" height="2" fill="#794000" />
    <rect x="14" y="21" width="4" height="2" fill="#794000" />
  </svg>
);

// Warp Pipe
export const WarpPipe: React.FC<{ size?: number; className?: string }> = ({ size = 48, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`pixelated ${className}`}>
    <rect x="1" y="2" width="14" height="5" fill="#00A800" />
    <rect x="1" y="2" width="14" height="1" fill="#68FF68" />
    <rect x="1" y="2" width="2" height="5" fill="#68FF68" />
    <rect x="13" y="2" width="2" height="5" fill="#004D00" />
    <rect x="0" y="2" width="1" height="5" fill="#000" />
    <rect x="15" y="2" width="1" height="5" fill="#000" />
    <rect x="1" y="1" width="14" height="1" fill="#000" />
    <rect x="1" y="7" width="14" height="1" fill="#000" />

    {/* Pipe Stem */}
    <rect x="3" y="7" width="10" height="9" fill="#00A800" />
    <rect x="3" y="7" width="2" height="9" fill="#68FF68" />
    <rect x="11" y="7" width="2" height="9" fill="#004D00" />
    <rect x="2" y="7" width="1" height="9" fill="#000" />
    <rect x="13" y="7" width="1" height="9" fill="#000" />
  </svg>
);


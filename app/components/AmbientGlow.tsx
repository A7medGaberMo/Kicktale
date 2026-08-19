"use client";

import React from 'react';

export default function AmbientGlow() {
  return (
    <div className="kt-ambient-canvas" aria-hidden="true">
      <div className="kt-ambient-blob kt-ambient-blob-1" />
      <div className="kt-ambient-blob kt-ambient-blob-2" />
    </div>
  );
}
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import ClipboardPlanner from './components/ClipboardPlanner';
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  return (
    <div className="h-full selection:bg-amber-200">
      <ClipboardPlanner />
      <Toaster />
    </div>
  );
}

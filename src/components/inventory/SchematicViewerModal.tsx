'use client';

import { motion } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

interface Props {
  url: string;
  title: string;
  onClose: () => void;
}

export default function SchematicViewerModal({ url, title, onClose }: Props) {
  const [zoom, setZoom] = useState(1);
  const isPdf = url.toLowerCase().endsWith('.pdf');

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col bg-surface-0/95 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="glass flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary">
          {title}
        </h2>

        <div className="flex items-center gap-1">
          {/* Zoom controls (only for images) */}
          {!isPdf && (
            <>
              <button
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:bg-white/5 hover:text-text-primary"
              >
                <ZoomOut size={16} />
              </button>
              <span className="min-w-[3rem] text-center text-xs text-text-tertiary">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:bg-white/5 hover:text-text-primary"
              >
                <ZoomIn size={16} />
              </button>
            </>
          )}

          {/* Download */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:bg-white/5 hover:text-text-primary"
          >
            <Download size={16} />
          </a>

          {/* Close */}
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl text-text-secondary hover:bg-white/5 hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {isPdf ? (
          <iframe
            src={url}
            className="h-full w-full max-w-5xl rounded-xl border border-white/[0.06] bg-white"
            title={title}
          />
        ) : (
          <div
            className="flex items-center justify-center overflow-auto"
            style={{ maxHeight: '100%', maxWidth: '100%' }}
          >
            <img
              src={url}
              alt={title}
              className="rounded-xl transition-transform duration-200"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                maxHeight: zoom <= 1 ? '80vh' : 'none',
                maxWidth: zoom <= 1 ? '100%' : 'none',
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

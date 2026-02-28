import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

const mediaSession = {
  metadata: null as MediaMetadata | null,
  setActionHandler: vi.fn(),
  setPositionState: vi.fn(),
};

const mockWritable = {
  write: vi.fn(),
  close: vi.fn(),
};

const mockFileHandle = {
  getFile: vi.fn(async () => new File(["audio"], "track.mp3", { type: "audio/mpeg" })),
  createWritable: vi.fn(async () => mockWritable),
};

const mockDirectory = {
  getFileHandle: vi.fn(async () => mockFileHandle),
  removeEntry: vi.fn(),
};

class MockMediaMetadata {
  constructor(public metadata: MediaMetadataInit) {}
}

class MockMediaError {
  static MEDIA_ERR_ABORTED = 1;
  static MEDIA_ERR_NETWORK = 2;
  static MEDIA_ERR_DECODE = 3;
  static MEDIA_ERR_SRC_NOT_SUPPORTED = 4;
}

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeAll(() => {
  vi.stubGlobal("MediaMetadata", MockMediaMetadata);
  vi.stubGlobal("MediaError", MockMediaError);
  vi.stubGlobal("ResizeObserver", MockResizeObserver);

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:mock"),
  });

  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(HTMLMediaElement.prototype, "load", {
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });

  Object.defineProperty(navigator, "mediaSession", {
    configurable: true,
    value: mediaSession,
  });

  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: {
      estimate: vi.fn(async () => ({ usage: 0, quota: 1024 * 1024 })),
      getDirectory: vi.fn(async () => mockDirectory),
    },
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

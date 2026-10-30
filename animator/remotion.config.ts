import { Config } from "@remotion/cli/config";

// three.js needs a real GL backend in headless Chrome.
Config.setChromiumOpenGlRenderer("angle");
// Lossless frames into the encoder, then a low CRF with a slow preset: flat cartoon colour and ink edges are
// where JPEG blocks and h264 smear show first.
Config.setVideoImageFormat("png");
Config.setCrf(14);
Config.setX264Preset("slow");
// Measured on a 10-core M-series Mac: 3 tabs render faster than the default 5 (GPU-bound three.js scenes).
Config.setConcurrency(3);

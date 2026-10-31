import { Composition } from "remotion";
import { LakeLitStill, LakePreview } from "./scenes/LakePreview";
import { FACE_TOUR_STEP, FacePreview, FaceTour } from "./scenes/FacePreview";
import { SlotHook } from "./scenes/SlotHook";
import { VIDEOS } from "./videos";

// Every video in src/videos/ becomes a composition named after its slug.
export const Root: React.FC = () => (
  <>
    {VIDEOS.map((v) => (
      <Composition key={v.slug} id={v.slug} component={v.Scene} durationInFrames={v.frames} fps={30} width={1080} height={1920} />
    ))}
    <Composition id="FaceTour" component={FaceTour} durationInFrames={FACE_TOUR_STEP * 15} fps={30} width={1080} height={1920} />
    <Composition id="FacePreview" component={FacePreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="SlotHook" component={SlotHook} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="LakePreview" component={LakePreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="LakeLitStill" component={LakeLitStill} defaultProps={{ lit: true }} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);

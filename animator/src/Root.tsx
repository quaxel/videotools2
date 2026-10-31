import { Composition } from "remotion";
import { LakeLitStill, LakePreview } from "./scenes/LakePreview";
import { FACE_TOUR_STEP, FacePreview, FaceTour, GESTURE_TOUR_FRAMES, GestureTour } from "./scenes/FacePreview";
import { MOVE_TOUR_FRAMES, MoveTour, SAD_WALK_FRAMES, SadWalk, WALK_TOWARD_FRAMES, WalkToward } from "./scenes/MovePreview";
import { AlleyPreview } from "./scenes/AlleyPreview";
import { GreatWallPreview } from "./scenes/GreatWallPreview";
import { CostumePreview } from "./scenes/CostumePreview";
import { MarathonPreview } from "./scenes/MarathonPreview";
import { SlotHook } from "./scenes/SlotHook";
import { SpacePreview } from "./scenes/SpacePreview";
import { VIDEOS } from "./videos";

// Every video in src/videos/ becomes a composition named after its slug.
export const Root: React.FC = () => (
  <>
    {VIDEOS.map((v) => (
      <Composition key={v.slug} id={v.slug} component={v.Scene} durationInFrames={v.frames} fps={30} width={1080} height={1920} />
    ))}
    <Composition id="FaceTour" component={FaceTour} durationInFrames={FACE_TOUR_STEP * 15} fps={30} width={1080} height={1920} />
    <Composition id="GestureTour" component={GestureTour} durationInFrames={GESTURE_TOUR_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="MoveTour" component={MoveTour} durationInFrames={MOVE_TOUR_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="WalkToward" component={WalkToward} durationInFrames={WALK_TOWARD_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SadWalk" component={SadWalk} durationInFrames={SAD_WALK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="FacePreview" component={FacePreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="SlotHook" component={SlotHook} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="MarathonPreview" component={MarathonPreview} durationInFrames={120} fps={30} width={1080} height={1920} />
    <Composition id="CostumePreview" component={CostumePreview} durationInFrames={30} fps={30} width={1080} height={1920} />
    <Composition id="GreatWallPreview" component={GreatWallPreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="AlleyPreview" component={AlleyPreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="SpacePreview" component={SpacePreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="LakePreview" component={LakePreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="LakeLitStill" component={LakeLitStill} defaultProps={{ lit: true }} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);

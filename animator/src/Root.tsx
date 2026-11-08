import { Composition } from "remotion";
import { LakeLitStill, LakePreview } from "./scenes/LakePreview";
import { FACE_TOUR_STEP, FacePreview, FaceTour, GESTURE_TOUR_FRAMES, GestureTour } from "./scenes/FacePreview";
import { MOVE_TOUR_FRAMES, MoveTour, SAD_WALK_FRAMES, SadWalk, WALK_TOWARD_FRAMES, WalkToward } from "./scenes/MovePreview";
import { AlleyPreview } from "./scenes/AlleyPreview";
import { BalloonPreview } from "./scenes/BalloonPreview";
import { GreatWallPreview } from "./scenes/GreatWallPreview";
import { ThronePreview } from "./scenes/ThronePreview";
import { DUEL_FRAMES, DuelAnim, DuelPreview } from "./scenes/DuelPreview";
import { CostumePreview } from "./scenes/CostumePreview";
import { MarathonPreview } from "./scenes/MarathonPreview";
import { MODEL_PREVIEW_FRAMES, ModelPreview } from "./scenes/ModelPreview";
import { LAUNDRY_FRAMES, LaundryPreview } from "./scenes/LaundryPreview";
import { DRIVE_FRAMES, DrivePreview } from "./scenes/DrivePreview";
import { PhysicsPreview } from "./scenes/PhysicsPreview";
import { SlotHook } from "./scenes/SlotHook";
import { SpacePreview } from "./scenes/SpacePreview";
import { SunlitLunch, SunlitLunchEat } from "./scenes/SunlitLunch";
import { TransitionPreview } from "./scenes/TransitionPreview";
import { VIDEOS } from "./videos";
import { DESIGN_FRAMES, DogNoseDesign } from "./videos/dog-nose/Design";
import { DESIGN_FRAMES as EAGLE_DESIGN_FRAMES, EagleVisionDesign } from "./videos/eagle-vision/Design";
import { SHEET_FRAMES as VR_SHEET_FRAMES, VikingRomanSheet } from "./videos/viking-vs-roman/ModelSheet";
import { GATE_FRAMES as VR_GATE_FRAMES, VikingRomanGate, VikingRomanGateStates, VikingRomanLit } from "./videos/viking-vs-roman/Tests";

// Every video in src/videos/ becomes a composition named after its slug.
export const Root: React.FC = () => (
  <>
    {VIDEOS.map((v) => (
      <Composition key={v.slug} id={v.slug} component={v.Scene} durationInFrames={v.frames} fps={30} width={v.size?.[0] ?? 1080} height={v.size?.[1] ?? 1920} />
    ))}
    <Composition id="DogNoseDesign" component={DogNoseDesign} durationInFrames={DESIGN_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="EagleVisionDesign" component={EagleVisionDesign} durationInFrames={EAGLE_DESIGN_FRAMES} fps={30} width={1080} height={1920} />
    {/* viking-vs-roman (16:9 long form): design stills */}
    <Composition id="VikingRomanSheet" component={VikingRomanSheet} durationInFrames={VR_SHEET_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="VikingRomanLit" component={VikingRomanLit} durationInFrames={2} fps={30} width={1920} height={1080} />
    <Composition id="VikingRomanGate" component={VikingRomanGate} durationInFrames={VR_GATE_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="VikingRomanGateStates" component={VikingRomanGateStates} durationInFrames={3} fps={30} width={1920} height={1080} />
    <Composition id="FaceTour" component={FaceTour} durationInFrames={FACE_TOUR_STEP * 15} fps={30} width={1080} height={1920} />
    <Composition id="GestureTour" component={GestureTour} durationInFrames={GESTURE_TOUR_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="MoveTour" component={MoveTour} durationInFrames={MOVE_TOUR_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="WalkToward" component={WalkToward} durationInFrames={WALK_TOWARD_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SadWalk" component={SadWalk} durationInFrames={SAD_WALK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="FacePreview" component={FacePreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="SlotHook" component={SlotHook} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="MarathonPreview" component={MarathonPreview} durationInFrames={120} fps={30} width={1080} height={1920} />
    <Composition id="CostumePreview" component={CostumePreview} durationInFrames={30} fps={30} width={1080} height={1920} />
    <Composition id="DuelPreview" component={DuelPreview} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="DuelAnim" component={DuelAnim} durationInFrames={DUEL_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ThronePreview" component={ThronePreview} durationInFrames={50} fps={30} width={1080} height={1920} />
    <Composition id="GreatWallPreview" component={GreatWallPreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="AlleyPreview" component={AlleyPreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="SpacePreview" component={SpacePreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="BalloonPreview" component={BalloonPreview} durationInFrames={240} fps={30} width={1080} height={1920} />
    <Composition id="TransitionPreview" component={TransitionPreview} durationInFrames={180} fps={30} width={1080} height={1920} />
    <Composition id="PhysicsPreview" component={PhysicsPreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="SunlitLunch" component={SunlitLunch} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="SunlitLunchEat" component={SunlitLunchEat} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition id="LakePreview" component={LakePreview} durationInFrames={150} fps={30} width={1080} height={1920} />
    <Composition
      id="ModelPreview"
      component={ModelPreview}
      defaultProps={{ src: "models/preview/car.glb", joints: { spin_FL: -5, spin_FR: -5, spin_RL: -5, spin_RR: -5 } }}
      durationInFrames={MODEL_PREVIEW_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition id="LaundryPreview" component={LaundryPreview} durationInFrames={LAUNDRY_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="DrivePreview" component={DrivePreview} durationInFrames={DRIVE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="LakeLitStill" component={LakeLitStill} defaultProps={{ lit: true }} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);

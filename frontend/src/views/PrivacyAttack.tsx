import View from "../components/View";
// import Discriminator from "../components/Discriminator";

export default function PrivacyAttack({ height }: { height: number }) {
  return (
    <View
      height={height}
      className="w-full flex justify-evenly items-center rounded-[6px] px-1.5"
    >
      {null}
      {/* <Discriminator mode="Baseline" />
      <Discriminator mode="Comparison" /> */}
    </View>
  );
}

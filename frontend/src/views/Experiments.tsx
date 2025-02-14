import View from "../components/View";
import Title from "../components/Title";
import Indicator from "../components/Indicator";
import DataTable from "../components/Experiments/DataTable";
import AddExperimentButton from "../components/Experiments/AddExperimentButton";
import { useForgetClass } from "../hooks/useForgetClass";
import { ViewProps } from "../types/common";
import { columns } from "../components/Experiments/Columns";
import { SettingsIcon } from "../components/UI/icons";

export default function Experiments({ width, height }: ViewProps) {
  const { forgetClassExist } = useForgetClass();

  return (
    <View width={width} height={height} className="border-t-0 border-l-0">
      <div className="flex justify-between items-center mb-[3px]">
        <Title
          Icon={<SettingsIcon />}
          title="Experiments"
          customClass="right-[1px]"
        />
        {forgetClassExist && <AddExperimentButton />}
      </div>
      {forgetClassExist ? (
        <DataTable columns={columns} />
      ) : (
        <Indicator about="ForgetClass" />
      )}
    </View>
  );
}

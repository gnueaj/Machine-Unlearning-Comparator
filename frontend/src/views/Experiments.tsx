import { useContext } from "react";

import View from "../components/View";
import AddExperimentButton from "../components/AddExperimentButton";
import Title from "../components/Title";
import Indicator from "../components/Indicator";
import DataTable from "../components/DataTable";
import { columns } from "../components/Columns";
import { SettingsIcon } from "../components/UI/icons";
import { ForgetClassContext } from "../store/forget-class-context";

export default function Experiments({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const { forgetClass } = useContext(ForgetClassContext);

  const forgetClassExist = forgetClass !== undefined;

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

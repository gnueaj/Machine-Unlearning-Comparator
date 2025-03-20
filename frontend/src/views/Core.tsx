import React, { useState } from "react";

import View from "../components/View";
import Title from "../components/Title";
import Indicator from "../components/Indicator";
import Embedding from "./Embedding";
import PrivacyAttack from "./PrivacyAttack";
import { CONFIG } from "../app/App";
import { useModelAExperiment } from "../stores/experimentsStore";
import { useModelBExperiment } from "../stores/experimentsStore";
import { useForgetClassStore } from "../stores/forgetClassStore";

const EMBEDDINGS = "embeddings";
const ATTACK = "attack";

export default function Core() {
  const forgetClass = useForgetClassStore((state) => state.forgetClass);
  const modelAExperiment = useModelAExperiment();
  const modelBExperiment = useModelBExperiment();

  const [displayMode, setDisplayMode] = useState(EMBEDDINGS);

  const isEmbeddingMode = displayMode === EMBEDDINGS;
  const forgetClassExist = forgetClass !== -1;

  const handleDisplayModeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const id = e.currentTarget.id;

    if (id === EMBEDDINGS) {
      setDisplayMode(EMBEDDINGS);
    } else {
      setDisplayMode(ATTACK);
    }
  };

  return (
    <View
      width={CONFIG.CORE_WIDTH}
      height={CONFIG.CORE_HEIGHT}
      borderTop
      borderBottom
    >
      <div className="flex items-center gap-1 mb-1.5 ml-1 relative right-1">
        <Title
          title="Embedding Space"
          id={EMBEDDINGS}
          className={`relative z-10 cursor-pointer px-1 ${
            !isEmbeddingMode && "text-gray-400 border-none"
          }`}
          AdditionalContent={isEmbeddingMode && <UnderLine />}
          onClick={handleDisplayModeChange}
        />
        <Title
          title="Attack Simulation"
          id={ATTACK}
          className={`relative z-10 cursor-pointer px-1 ${
            isEmbeddingMode && "text-gray-400 border-none"
          }`}
          AdditionalContent={!isEmbeddingMode && <UnderLine />}
          onClick={handleDisplayModeChange}
        />
      </div>
      {forgetClassExist && modelAExperiment && modelBExperiment ? (
        isEmbeddingMode ? (
          <Embedding
            modelAPoints={modelAExperiment.points}
            modelBPoints={modelBExperiment.points}
          />
        ) : (
          <PrivacyAttack
            modelAPoints={modelAExperiment.points}
            modelBPoints={modelBExperiment.points}
          />
        )
      ) : (
        <Indicator about="ForgetClass" />
      )}
    </View>
  );
}

function UnderLine() {
  return <div className="absolute w-full h-0.5 bg-black right-0 -bottom-0.5" />;
}

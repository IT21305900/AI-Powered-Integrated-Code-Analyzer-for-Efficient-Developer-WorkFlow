import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import Link from "next/link";
import IDENavigator from "./WorkSpaceDialog";
import { getFeaturesList } from "@/lib/utils";

type Feature = {
  id: string;
  feature: string;
  value: string;
  description: string;
};

const Features = () => {
  const data = getFeaturesList();

  return (
    <div className="col-span-4 flex flex-col gap-4">
      {data.map((feature: Feature) => (
        <FeatureCard key={feature.id} {...feature} />
      ))}
    </div>
  );
};

const FeatureCard = (feature: Feature) => {
  return (
    <Link className="block group" href={`?feature=${feature.value}`}>
      <IDENavigator>
        <Card className="rounded-md text-left shadow-sm bg-white w-full border border-gray-200 transition-all duration-200 ease-in-out group-hover:shadow-md group-hover:border-gray-300 group-hover:translate-y-[-2px]">
          <CardHeader>
            <CardTitle className="text-xl font-medium antialiased group-hover:text-gray-900">
              {feature.feature}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="group-hover:text-gray-700">
              {feature.description}
            </CardDescription>
          </CardContent>
        </Card>
      </IDENavigator>
    </Link>
  );
};

export default Features;

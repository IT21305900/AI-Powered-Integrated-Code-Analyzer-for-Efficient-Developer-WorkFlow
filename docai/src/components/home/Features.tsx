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
    <div className="col-span-4 grid grid-cols-1 gap-2">
      {data.map((feature: Feature) => (
        <FeatureCard key={feature.id} {...feature} />
      ))}
    </div>
  );
};

const FeatureCard = (feature: Feature) => {
  return (
    <Link className="block" href={`?feature=${feature.value}`}>
      <IDENavigator>
        <Card className="rounded-md text-left shadow-sm bg-white w-full ">
          <CardHeader>
            <CardTitle className="text-xl font-medium antialiased">
              {feature.feature}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>{feature.description}</CardDescription>
          </CardContent>
        </Card>
      </IDENavigator>
    </Link>
  );
};

export default Features;

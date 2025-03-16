import { clsx, type ClassValue } from "clsx";
import { features } from "process";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getFeaturesList = () => {
  return [
    {
      id: "1",
      feature: "Documentation",
      value: "documentation",
      description:
        "Our website is built with a responsive design, ensuring it looks great on any device.",
    },
    {
      id: "2",
      feature: "Chat Bot",
      value: "chat",
      description:
        "We use Google's SEO practices to make your website stand out from the competition.",
    },
    {
      id: "3",
      feature: "Vidual Aid",
      value: "visual",
      description:
        "Our website is intuitive and easy to navigate, making it easy for users to find what they're looking for.",
    },
    {
      id: "4",
      value: "feedback",
      feature: "Feedback",
      description:
        "Our website is intuitive and easy to navigate, making it easy for users to find what they're looking for.",
    },
  ];
};

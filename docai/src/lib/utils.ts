import { clsx, type ClassValue } from "clsx";
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
        "Comprehensive and well-structured documentation to help users understand the system easily.",
    },
    {
      id: "2",
      feature: "Chat Bot",
      value: "chat",
      description:
        "An AI-powered chatbot to assist users and provide quick answers to their queries.",
    },
    {
      id: "3",
      feature: "Vidual Aid",
      value: "visual",
      description:
        "Rich visual elements and intuitive UI to enhance user experience.",
    },
    {
      id: "4",
      value: "feedback",
      feature: "Feedback",
      description:
        "A structured feedback mechanism to gather user insights and improve the system.",
    },

  ];
};

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GetRepositoryByName, GetRepositoryResult } from "@/lib/actions/repo.action";
import { useQuery } from "@tanstack/react-query";
import { PlayCircle, ArrowDown, Loader2 } from "lucide-react";
import { set } from "mongoose";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useUser } from "@clerk/nextjs";

const Chat = () => {
  const { isSignedIn, user, isLoaded } = useUser();

  const searchParams = useSearchParams();
  const repository = searchParams.get("repository");


  const [repoUrl, setRepoUrl] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [stepStatus, setStepStatus] = useState({
    step1: "pending",
    step2: "pending",
    step3: "pending",
    step4: "pending", // Added step 4 for chatbot launch
  });

  const [isChatbotVisible, setIsChatbotVisible] = useState(false); // State to control chatbot visibility
  const [chatbotRepository, setChatbotRepository] = useState<string | null>(null); // State to store the repository


  // TanStack Query to fetch repository data
  const {
    data,
    isLoading,
    isError,
    error,
    isSuccess
  } = useQuery({
    queryKey: ['repository', repository],
    queryFn: async (): Promise<GetRepositoryResult> => {
      if (!repository) throw new Error("No repository name provided");
      return await GetRepositoryByName(repository);
    },
    enabled: !!repository,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })

  // Handle successful data fetch (replaces onSuccess)
  useEffect(() => {
    if (isSuccess && data?.success && data.data) {
      setRepoUrl(data.data.link || "");
      toast.success(data.message);
    } else if (isSuccess && data && !data.success) {
      toast.error(data.message);
    }
  }, [isSuccess, data]);

  // Handle errors (replaces onError)
  useEffect(() => {
    if (isError && error) {
      toast.error(error.message || 'Failed to fetch repository data');
    }
  }, [isError, error]);

  if (isError || error) {
    toast.error(error?.message || 'Failed to fetch repository data');
  }

  if (isLoading) return <div>Loading</div>;

  const handleRun = async () => {
    if (!repoUrl.trim()) return;

    setStepStatus({ step1: "completed", step2: "inProgress", step3: "pending", step4: "pending" });

    try {
      console.log("Sending request to generate exercises...");
      const response = await fetch("http://54.204.84.107:5000/generate-exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl }),
      });

      if (!response.ok) throw new Error("Failed to fetch data");

      const data = await response.json();
      console.log("Full Response Data:", data); // Log the entire response

      // Use 'repository' instead of '_id'
      const chatbotRepository = data.repository; // Assuming the 'repository' field exists
      console.log("Chatbot Repository:", chatbotRepository); // Log the chatbot repository

      setQuestions(data.questions || []);
      setChatbotRepository(chatbotRepository); // Set the chatbotRepository

      setStepStatus({ step1: "completed", step2: "completed", step3: "inProgress", step4: "pending" });

      setTimeout(() => {
        setStepStatus({ step1: "completed", step2: "completed", step3: "completed", step4: "pending" });
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      setStepStatus({ step1: "completed", step2: "failed", step3: "failed", step4: "failed" });
    }
  };

  const handleLaunchChatbot = () => {
    setIsChatbotVisible(true); // Show chatbot when step 4 button is clicked
    setStepStatus(prevState => ({
      ...prevState,
      step4: "completed", // Mark step 4 as completed when chatbot is launched
    }));
  };

  const handleCloseChatbot = () => {
    setIsChatbotVisible(false); // Close chatbot modal
  };

  return (
    <div className="flex h-screen">
      {/* Left 50% - KT Assistant Workflow */}
      <div className="w-1/2 overflow-y-auto border-r p-4">
        <div className="border-b py-1">
          <p className="lead mx-5">KT Assistant Workflow</p>
        </div>

        <div className="space-y-3 w-full max-w-md mx-auto mt-4">
          <Step step="Select the project" index={1}>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="repo">Project URL</Label>
              <div className="flex gap-2">
                <Input
                  id="repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/indraxyz/simple-crud-reactjs-nextjs"
                />
                <Button onClick={handleRun} disabled={stepStatus.step1 === "completed"}>
                  {stepStatus.step1 === "completed" ? "Completed ✅" : "Run"}
                  <PlayCircle className="ml-1" />
                </Button>
              </div>
            </div>
          </Step>

          <ArrowDown className="mx-auto" />

          <Step step="Analyzing Repository" index={2}>
            <div className="flex justify-center">
              <Button disabled>
                {stepStatus.step2 === "inProgress" ? (
                  <><Loader2 className="animate-spin mr-2" /> In Progress...</>
                ) : stepStatus.step2 === "completed" ? (
                  "Completed ✅"
                ) : (
                  "Pending ⏳"
                )}
              </Button>
            </div>
          </Step>

          <ArrowDown className="mx-auto" />

          <Step step="Generating Questions" index={3}>
            <div className="flex justify-center">
              <Button disabled>
                {stepStatus.step3 === "inProgress" ? (
                  <><Loader2 className="animate-spin mr-2" /> In Progress...</>
                ) : stepStatus.step3 === "completed" ? (
                  "Completed ✅"
                ) : (
                  "Pending ⏳"
                )}
              </Button>
            </div>
          </Step>

          <ArrowDown className="mx-auto" />

          <Step step="Launch Chatbot" index={4}>
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  window.location.href = `https://d1c6dudbx22yi.cloudfront.net?email=${user?.primaryEmailAddress?.emailAddress}`;
                }}
                disabled={stepStatus.step3 !== "completed"}
              >
                {stepStatus.step4 === "completed" ? (
                  "Completed ✅"
                ) : (
                  "Launch Chatbot"
                )}
              </Button>
            </div>
          </Step>
        </div>
      </div>

      {/* Right 50% - Generated Questions */}
      <div className="w-1/2 overflow-y-auto p-4">
        <div className="border-b py-1">
          <p className="lead mx-5 text-white">Generated Questions</p>
        </div>
        <div className="p-4">
          {questions.length > 0 ? (
            <ul className="list-disc list-inside space-y-2">
              {questions.map((question, index) => (
                <li key={index} className="text-white-700">{question}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Questions will be displayed here...</p>
          )}
        </div>
      </div>

      {/* Chatbot Modal (conditionally displayed when button clicked) */}
      {isChatbotVisible && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-semibold">Chatbot</h3>
            <div className="mt-4">
              {/* <Chatbot chatbotRepository={chatbotRepository} onClose={handleCloseChatbot} /> Pass the onClose function */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;

const Step = ({ children, step, index }: { children: React.ReactNode; step: string; index: number }) => {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Step {index}</CardDescription>
        <CardTitle className="font-medium">{step}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const History = () => {
  return (
    <Tabs defaultValue="documentation" className="rounded-full">
      <TabsList className="rounded-full">
        <TabsTrigger className="rounded-full text-lg" value="documentation">
          Documents
        </TabsTrigger>
        <TabsTrigger className="rounded-full text-lg" value="chat">
          Chat
        </TabsTrigger>
        <TabsTrigger className="rounded-full text-lg" value="visual">
          Visual Aids
        </TabsTrigger>
        <TabsTrigger className="rounded-full text-lg" value="feedback">
          Pattern & Feedback
        </TabsTrigger>
      </TabsList>
      <TabsContent value="documentation">Documentation</TabsContent>
      <TabsContent value="chat">Chat</TabsContent>
      <TabsContent value="visual">Visual</TabsContent>
      <TabsContent value="feedback">Password</TabsContent>
    </Tabs>
  );
};

export default History;

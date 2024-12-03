# Environment Setup Guidelines


  ## Environment Setup Guidelines 
  


  ### Project Setup Guidelines
  

  Sure! Below are the detailed setup instructions for the project based on the provided `package.json` scripts.

### Project Setup Instructions

#### 1. Installing Dependencies

Before you can run the project, you need to ensure that all dependencies are installed. Go through the following steps:

1. **Install Node.js**: First, make sure that you have Node.js installed on your machine. You can download it from the [Node.js official website](https://nodejs.org/). Choose the version most suitable for your operating system (LTS is recommended).

2. **Clone the Project Repository**: If you haven't already, clone the project repository from your version control system (e.g., GitHub, GitLab) to your local machine. 
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

3. **Install Dependencies**: Once you're in the project's root directory, run the following command in your terminal:
   ```bash
   npm install
   ```
   This command will read the `package.json` file and install all the dependencies specified in it.

#### 2. Running Development Scripts

The project has several npm scripts that you can run. To execute a script, use the following command:
```bash
npm run <script-name>
```

Here are the scripts you can run:

- **dev**: This script typically starts the development server which allows you to start building and testing your application locally. The command may vary, but generally it could look something like this:
  ```bash
  npm run dev
  ```
  
- **build**: This command usually compiles your application into a production-ready bundle. It performs any pre-processing, bundling, and optimizations needed for deploying your app.
  ```bash
  npm run build
  ```

- **start**: Use this script to launch the built application in a production mode. This is often used to run the app in a server environment after the build process.
  ```bash
  npm start
  ```

- **lint**: This script checks your code for stylistic and programming errors based on the linting configuration you have set up in your project (e.g., ESLint). Running this helps keep your codebase clean and maintainable.
  ```bash
  npm run lint
  ```

#### 3. Special Setup Considerations

- **Environment Variables**: Some projects require specific environment variables to be configured before they can run properly. Check for a `.env` file in the project root or consult the project documentation for any necessary environment variables. Create a `.env` file (if it doesn't exist) and add the required variables in the format:
  ```
  VARIABLE_NAME=value
  ```
  
- **Additional Tools**: Depending on the project, there may be additional tools required. For example, if you're using TypeScript, ensure you have the TypeScript compiler installed locally.
  
- **Database Setup**: If your project interacts with a database, make sure you have the database set up and running. You may need to run migrations or seed data depending on your backend setup.

- **Version Control**: Ensure you are using compatible versions of Node.js and package dependencies (check `package.json` for version ranges).

#### 4. Explanation of Available npm Scripts

- **dev**: Launches the development server (often with hot-reloading) to allow developers to view live changes in the application as they code.

- **build**: Prepares the application for production by bundling and optimizing files, performing tasks like minification, and creating distribution-ready assets.

- **start**: Runs the application in a production environment, typically leveraging the output of the build script. It's used to serve your application to users after it's been built.

- **lint**: Analyzes code to find potential issues according to predefined rules and coding styles, ensuring adherence to best practices and maintaining code quality.

By following these instructions, you should be able to set up and start working on the project effectively. If you encounter any issues, refer to the project documentation or reach out to your team for assistance.
  


  ### Dependency Explanations
  Setting up a development environment for your project involves configuring the necessary dependencies and making sure that your setup is ready for building and running your applications efficiently. Below is an explanation of each of the dependencies you mentioned, what they do, and how to install them:

### 1. `@clerk/nextjs`
**Description**: Clerk provides authentication and user management features for applications built with Next.js. It allows you to easily add sign-up, login, and user profile functionalities.

**Installation**:
```bash
npm install @clerk/nextjs
```

### 2. `@radix-ui/react-dialog`
**Description**: This package offers a set of primitive React components for building accessible dialog modals. It's part of Radix UI, which focuses on building UI components with accessibility in mind.

**Installation**:
```bash
npm install @radix-ui/react-dialog
```

### 3. `@radix-ui/react-dropdown-menu`
**Description**: A component for implementing dropdown menus in your applications. It is also built with accessibility as a priority and integrates seamlessly with other Radix components.

**Installation**:
```bash
npm install @radix-ui/react-dropdown-menu
```

### 4. `@radix-ui/react-popover`
**Description**: This package allows developers to create popover components that can display additional information when triggered by various events.

**Installation**:
```bash
npm install @radix-ui/react-popover
```

### 5. `@radix-ui/react-slot`
**Description**: This utility enables the creation of slots, allowing children components to be defined and filled in a structured manner, improving flexibility and composition.

**Installation**:
```bash
npm install @radix-ui/react-slot
```

### 6. `@radix-ui/react-toast`
**Description**: A set of components for easily creating toast notifications that inform users about actions taken within the app.

**Installation**:
```bash
npm install @radix-ui/react-toast
```

### 7. `@stream-io/node-sdk`
**Description**: A SDK to interact with Stream's backend services for building chat applications. It provides the necessary tools to send and receive messages.

**Installation**:
```bash
npm install @stream-io/node-sdk
```

### 8. `@stream-io/video-react-sdk`
**Description**: This SDK is used for integrating video functionalities into your React applications, allowing for real-time communications and video interactions.

**Installation**:
```bash
npm install @stream-io/video-react-sdk
```

### 9. `class-variance-authority`
**Description**: A utility that helps you define Tailwind CSS classes in a more structured way, making it easy to manage and apply conditional styles based on variants.

**Installation**:
```bash
npm install class-variance-authority
```

### 10. `clsx`
**Description**: A utility for constructing conditional className strings easily. It helps simplify the process of managing dynamic class names in React components.

**Installation**:
```bash
npm install clsx
```

### 11. `date-fns`
**Description**: A JavaScript library for working with dates, offering a wide range of functions for manipulating and formatting dates in a functional way.

**Installation**:
```bash
npm install date-fns
```

### 12. `lucide-react`
**Description**: A collection of svg icons for React projects that are inspired by Feather icons. Allows for easy inclusion of icons into components.

**Installation**:
```bash
npm install lucide-react
```

### 13. `next`
**Description**: The core framework for building server-rendered React applications. It provides routing, server-side rendering, static site generation, and other features.

**Installation**:
```bash
npm install next
```

### 14. `react`
**Description**: The core library for building user interfaces in JavaScript. React components form the building blocks of your application.

**Installation**:
```bash
npm install react
```

### 15. `react-datepicker`
**Description**: A simple and reusable datepicker component for React. Makes it easy to integrate date selection into forms.

**Installation**:
```bash
npm install react-datepicker
```

### 16. `react-dom`
**Description**: The entry point for working with DOM in a React application. It provides methods to manipulate the DOM and render React components.

**Installation**:
```bash
npm install react-dom
```

### 17. `tailwind-merge`
**Description**: A utility function to combine Tailwind CSS classes intelligently. It helps in merging multiple class names while ensuring that conflicts are resolved correctly.

**Installation**:
```bash
npm install tailwind-merge
```

### 18. `tailwindcss-animate`
**Description**: A Tailwind CSS plugin that provides utilities for animations, making it easier to add CSS animations to your elements.

**Installation**:
```bash
npm install tailwindcss-animate
```

### 19. `uuid`
**Description**: A utility to generate unique IDs. Useful for creating identifiers for components, forms, or any other elements that require uniqueness.

**Installation**:
```bash
npm install uuid
```

### Setting Up the Environment
After installing the above dependencies, you can start setting up your development environment. Follow these steps:

1. **Initialize the project**:
    ```bash
    npx create-next-app@latest my-app
    cd my-app
    ```
   
2. **Install dependencies**:
   Run the npm install commands for each dependency mentioned above.

3. **Configure Tailwind CSS** (if you plan to use Tailwind):
    - Install Tailwind CSS by following [official documentation](https://tailwindcss.com/docs/guides/nextjs).
    - Set up the required configuration files such as `tailwind.config.js` and `postcss.config.js`.

4. **Set up Clerk for authentication** by following [Clerk documentation](https://clerk.dev/docs/nextjs/get-started).

5. **Create your components**:
    Implement the required UI components using the libraries you've installed.

6. **Run your application**:
    ```bash
    npm run dev
    ```
Open your browser and navigate to `http://localhost:3000` to see your application in action.

By following these steps, you can effectively set up a robust development environment tailored to your project's needs.
   


# Routing Documentation



## repositories\zoom-clone\app\(root)\(home)\previous\page.tsx

```markdown
# Project Code Documentation: Previous Page Component

This document serves as a guide for developers to identify and understand the codebase of the `Previous Page` component within the Zoom Clone application. This component is part of a Next.js 14 project and showcases how to build UI components in conjunction with the framework.

## File Location
- **File:** `routing repositories/zoom-clone/app/(root)/(home)/previous/page.tsx`

## Component Overview

The `PreviousPage` component is responsible for rendering a list of calls that have already ended. This is useful for users who want to review their past call history. It leverages a child component called `CallList` to fetch and display the information accordingly.

### Code Breakdown

```tsx
import CallList from "@/components/CallList";

const PreviousPage = () => {
  return (
    <section className="flex size-full flex-col gap-10 text-white">
      <h1 className="text-3xl font-bold">Previous Calls</h1>
      <CallList type="ended" />
    </section>
  );
};

export default PreviousPage;
```

#### Import Statement
- `import CallList from "@/components/CallList";`  
  Imports the `CallList` component from the specified path. The `CallList` component is responsible for retrieving and displaying call records.

#### Functional Component
- `const PreviousPage = () => { ... }`  
  Defines a functional component named `PreviousPage` which is the main container.

#### Return Statement
- The component returns JSX that describes the UI structure:

1. **Section Element**: 
   - The component is wrapped inside a `<section>` with tailwind CSS classes for styling:
     - `flex`: Enables flexbox layout.
     - `size-full`: Ensures the section takes the full height and width.
     - `flex-col`: Aligns children in a column.
     - `gap-10`: Adds a gap between the children elements.
     - `text-white`: Sets text color to white.

2. **Header**: 
   - `<h1 className="text-3xl font-bold">Previous Calls</h1>`: A header element that displays the title "Previous Calls" in a large bold font.

3. **CallList Component**: 
   - `<CallList type="ended" />`: The `CallList` component is rendered with a prop `type` set to `"ended"`. This indicates that the list will contain calls that have concluded.

### Export Statement
- `export default PreviousPage;`  
  Exports the `PreviousPage` component as the default export, making it accessible to other parts of the application.

## Usage
To use the `PreviousPage` component, simply import it within your routing configuration in Next.js, and ensure that it's added to the appropriate route for displaying previous calls.

## Notes
- Ensure that the `CallList` component is well-defined to handle the logic of fetching and rendering ended calls.
- This component uses Tailwind CSS for styling; ensure that the Tailwind setup is correctly configured in the project for the styles to apply.

### Further References
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
```
This markdown documentation provides a comprehensive overview of the `PreviousPage` component, detailing its purpose, structure, and usage along with key coding principles used within the context of Next.js 14.

## repositories\zoom-clone\app\(root)\(home)\upcoming\page.tsx

# Project Code Documentation for UpcomingPage Component

## File Path
```
routing repositories/zoom-clone/app/(root)/(home)/upcoming/page.tsx
```

### Overview
The `UpcomingPage` component is a Next.js 14 functional component responsible for rendering the "Upcoming Meetings" section of a video calling application, often referred to as a zoom clone. It imports a subcomponent called `CallList`, which is responsible for displaying a list of upcoming meetings.

### Content Breakdown

```javascript
import CallList from '@/components/CallList';
```
- **Import Statement**: This line imports the `CallList` component from the components directory. The `@` symbol is a shorthand for the project's base directory, allowing for more concise import statements.

```javascript
const UpcomingPage = () => {
```
- **Component Declaration**: Here, we declare a functional component called `UpcomingPage`. This component follows standard React conventions and is designed to be a presentational component.

```javascript
  return (
    <section className="flex size-full flex-col gap-10 text-white">
```
- **JSX Structure**: The component returns a JSX structure encapsulated within a `<section>` element. The section uses several Tailwind CSS utility classes:
  - `flex`: Applies Flexbox layout to the section.
  - `size-full`: Ensures the section takes the full size of its parent.
  - `flex-col`: Arranges children elements in a column.
  - `gap-10`: Adds a gap between child elements.
  - `text-white`: Sets the text color to white.

```javascript
    <h1 className="text-3xl font-bold">Upcoming Meeting</h1>
```
- **Heading Element**: A heading `<h1>` tag displays the title "Upcoming Meeting," styled to have a large font size (`text-3xl`) and bold font weight (`font-bold`).

```javascript
    <CallList type="upcoming" />
```
- **CallList Component**: The `CallList` component is invoked with a prop `type` set to `"upcoming"`. This indicates that the list should filter and display meetings scheduled for the future.

```javascript
  </section>
);
```
- **Closing Tags**: The `section` and functional component tags are appropriately closed, completing the return statement.

```javascript
export default UpcomingPage;
```
- **Export Statement**: Finally, the `UpcomingPage` component is exported as the default export from this module, allowing it to be imported and rendered in other parts of the application, such as in the routing setup.

### Next.js Context
This component adheres to the conventions of Next.js 14, which promotes a file-based routing system where the file structure directly corresponds to the application's routes. The `page.tsx` file automatically becomes the landing page for the `/upcoming` route of the application.

### Summary
In summary, the `UpcomingPage` component serves as the interface for users to view their upcoming meetings. It utilizes a modern React functional component structure with Tailwind CSS for styling and integration with Next.js for routing and page rendering.

## repositories\zoom-clone\app\(root)\(home)\page.tsx

# Project Codebase Documentation

This documentation provides an overview of the project codebase specifically for the **Zoom Clone** application. It aims to assist developers in navigating and understanding the code structure, particularly focusing on key files and their functionalities.

## Overview

### Project Structure

The project is structured into a modular setup, enabling easy navigation and maintenance of the code. Below are the notable files and directories:

- **routing repositories** (This may refer to directories or components pertaining to routing logic)
- `zoom-clone`
  - **app**
    - **(root)**
      - **(home)**
        - `page.tsx`

---

## File Documentation

### `page.tsx`

#### Location
`routing repositories/zoom-clone/app/(root)/(home)/page.tsx`

#### Explanation
This file constitutes the main page of the home section of the application, designed using Next.js 14. It serves as an entry point for users and primarily showcases a greeting and time details alongside a component for displaying meeting types.

#### Code Breakdown

```tsx
import MeetingTypeList from '@/components/MeetingTypeList';

const Home: React.FC = () => {
  // Getting the current date and time
  const now = new Date();

  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const date = (new Intl.DateTimeFormat('en-US', { dateStyle: 'full' })).format(now);

  return (
    <section className="flex size-full flex-col gap-5 text-white">
      <div className="h-[303px] w-full rounded-[20px] bg-hero bg-cover">
        <div className="flex h-full flex-col justify-between max-md:px-5 max-md:py-8 lg:p-11">
          <h2 className="glassmorphism max-w-[273px] rounded py-2 text-center text-base font-normal">
            Upcoming Meeting at: 12:30 PM
          </h2>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold lg:text-7xl">{time}</h1>
            <p className="text-lg font-medium text-sky-1 lg:text-2xl">{date}</p>
          </div>
        </div>
      </div>

      <MeetingTypeList />
    </section>
  );
};

export default Home;
```

#### Component Description

1. **Imports**:
   - Importing the `MeetingTypeList` component from the project’s components directory.

2. **Functional Component**:
   - The `Home` component is defined as a functional component using TypeScript (indicated by `React.FC`).

3. **Date and Time Handling**:
   - The current date and time are retrieved using JavaScript's `Date` object.
   - `now.toLocaleTimeString` formats the time to a 12-hour clock format.
   - `Intl.DateTimeFormat` formats the date into a readable string.

4. **JSX Structure**:
   - A section is created to house the content with responsive styling and dark text color.
   - Contains a greeting to the user alongside the current time and date displayed prominently.
   - The dimensions of the `div` are set for styling purposes, and classes are added for background images and colors.

5. **MeetingTypeList Component**:
   - The `MeetingTypeList` component is rendered at the bottom, which is likely responsible for displaying the various meeting types available to the user.

#### CSS Classes:
These utility classes indicate the usage of either TailwindCSS or a similar utility-first CSS framework, enabling responsive design and styling directly in the JSX structure.

### Usage
This component acts as the main page view for logged-in users, emphasizing immediate access to meeting information and surroundings. 

---

## Conclusion

This documentation aims to facilitate your understanding of the `page.tsx` file and its role within the Zoom Clone application. For further assistance, refer to other components and modules documented throughout the codebase. Happy coding!

## repositories\zoom-clone\app\(auth)\sign-up\[[...sign-up]]\page.tsx

# Project Codebase Documentation

## Project Overview
This project is a Zoom Clone application built using Next.js 14 and Clerk for authentication. The application allows users to sign up, log in, and manage video conferencing features. Below is detailed documentation on the key code files within the project to aid developers in understanding the codebase better.

---

## File: `app/(auth)/sign-up/[[...sign-up]]/page.tsx`

### Purpose
This file represents the sign-up page for users. It leverages the `SignUp` component from Clerk's Next.js integration to provide built-in sign-up functionality.

### Explanation
In the context of Next.js 14, this page file follows the new `app` directory routing structure. The file exports a React component, `SignUpPage`, which encapsulates the sign-up interface.

#### Code Snippet
```tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main className="flex h-screen w-full items-center justify-center">
      <SignUp />
    </main>
  );
}
```

### Breakdown
- **Imports**: 
    - The `SignUp` component is imported from `@clerk/nextjs`. This component handles the user sign-up logic and UI.

- **Component Definition**: 
    - `SignUpPage` is defined as a default function component.
  
- **Return JSX**: 
    - The component returns a `<main>` element that centers the sign-up interface both vertically and horizontally on the screen using utility classes from a CSS framework (likely Tailwind CSS).
    - The `SignUp` component is included within the main container, rendering the sign-up form.

### Styling
- The styling uses Flexbox to create a flexible layout that centers the contained sign-up form. The classes `h-screen`, `w-full`, `items-center`, and `justify-center` ensure that the sign-up form is centered within a full-height and full-width screen.

---

### Conclusion
This documentation serves as a guide for developers looking to understand the structure and purpose of the sign-up page within the application. The integration with Clerk simplifies the authentication process, allowing developers to focus on enhancing the user experience around video conferencing. 

For further exploration, developers may want to check other related files, such as the login page and other authentication routes.

## repositories\zoom-clone\app\(auth)\sign-in\[[...sigin-in]]\page.tsx

# Code Documentation for the Zoom Clone Project

## Project Overview
This project is a Zoom clone built using Next.js 14 and Clerk for authentication. The goal is to create a video conferencing application with user authentication, video chat capabilities, and a streamlined user interface.

## Code File Structure

### `routing repositories/zoom-clone/app/(auth)/sign-in/[...sigin-in]/page.tsx`

#### Explanation
This code file is responsible for rendering the Sign-In page of the application. It utilizes Clerk's `SignIn` component, which manages the user authentication process.

#### Code Breakdown
```javascript
import { SignIn } from '@clerk/nextjs';

export default function SiginInPage() {
  return (
    <main className="flex h-screen w-full items-center justify-center">
      <SignIn />
    </main>
  );
}
```

- **Imports**
  - `SignIn`: Imported from '@clerk/nextjs', this component provides the user interface for signing in users and integrates with Clerk's authentication service.

- **Function Component**
  - `SiginInPage`: This is a functional component that serves as the layout for the Sign-In page.

- **Return Statement**
  - The component returns a JSX structure for the Sign-In page:
    - `<main>`: A wrapper element that uses utility classes for styling.
      - `className="flex h-screen w-full items-center justify-center"`: Utilizes Tailwind CSS utility classes to set:
        - `flex`: Enables flexbox layout.
        - `h-screen`: Sets the height to 100% of the viewport height.
        - `w-full`: Makes the element take up the entire width.
        - `items-center`: Vertically aligns the items in the center.
        - `justify-center`: Horizontally centers the items in the container.
    - `<SignIn />`: This renders the sign-in form provided by Clerk.

#### Key Points
- Ensure that next.js and Clerk packages are correctly installed and configured in your project for this component to work seamlessly.
- The appearance and functionality of the Sign-In component can be customized through Clerk's extensive configuration options.

#### Additional Notes
- Learn more about Clerk authentication components by visiting the [Clerk Documentation](https://clerk.dev/docs/).

## Conclusion
This documentation provides a high-level overview and detailed breakdown of the `page.tsx` file responsible for the Sign-In functionality in the Zoom clone application. Understanding this component will aid developers in navigating the codebase and implementing additional authentication features as required.

# Components and API Calls

# Project Codebase Documentation

This documentation provides an overview of the project's codebase to help developers better understand its structure and functionality. The project is built using **Next.js 14**, and incorporates features from the **Stream Video SDK** to enable video calling and meeting functionalities. Below are descriptions of key components and their functionalities within the code.

## File Structure

### 1. `MeetingRoom.tsx`
This component manages the video meeting interface. It handles various layouts and call controls. Key features include:

- **Layouts**: Implements different call layouts like grid and speaker layouts.
- **Participants List**: Displays the list of participants in the call.
- **Call Controls**: Provides controls for joining/leaving a call and changing layout.
- **Calling State**: Manages the state of the call using the `useCallStateHooks()`.

### Example Code
```javascript
const CallLayout = () => {
  switch (layout) {
    case 'grid':
      return <PaginatedGridLayout />;
    case 'speaker-right':
      return <SpeakerLayout participantsBarPosition="left" />;
    default:
      return <SpeakerLayout participantsBarPosition="right" />;
  }
};
```

### 2. `Sheet.tsx` (Utility Component)
This file defines a reusable sheet component using Radix UI for creating modal-like overlays. 

- **Variants**: The `sheetVariants` function determines the position of the sheet (left, right, top, bottom).
- **Content Management**: Simplifies the rendering of modal content like header, footer, and title.

### Example Code
```javascript
const SheetContent = React.forwardRef(({ side = 'right', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
));
```

### 3. `Card.tsx`
Defines a card component used throughout the application for displaying meeting and call details.

- **Header, Title, Description**: Each card has sections for the header, title, and description, allowing for a clear presentation of the relevant information.

### Example Code
```javascript
const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));
```

### 4. `CallList.tsx`
Manages and displays a list of calls, which can be ended calls, upcoming calls, or recordings.

- **Data Handling**: Fetches and filters calls based on their type.
- **Loading State**: Displays a loader while data is being fetched.

### Example Code 
```javascript
useEffect(() => {
  const fetchRecordings = async () => {
    const callData = await Promise.all(
      callRecordings?.map((meeting) => meeting.queryRecordings()) ?? [],
    );
    // Process recordings...
  };
  if (type === 'recordings') {
    fetchRecordings();
  }
}, [type, callRecordings]);
```

### 5. `MeetingTypeList.tsx`
Allows users to create or join meetings, presenting options for scheduling or starting an instant meeting.

- **Modal Handling**: Utilizes the `MeetingModal` component for entering details or confirmation dialogs.
- **User Interaction**: Directs users based on the selected action (e.g., joining a meeting or scheduling it).

### Example Code
```javascript
<HomeCard
  title="New Meeting"
  handleClick={() => setMeetingState('isInstantMeeting')}
/>
```

## Utilities

### 1. `cn.ts`
A utility function that combines class names conditionally, allowing for cleaner DOM manipulation when applying styles.

### Example Code
```javascript
export const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');
```

## Conclusion

This documentation aims to provide a foundational understanding of the project’s structure and key components. Developers new to the codebase should familiarize themselves with these files to effectively add features or maintain the application. For any specific queries related to implementation, please refer to the corresponding components' code or raise questions in the project discussions.

# Utility Functions

# Project Documentation

This document serves to provide developers with an overview of the codebase for a Next.js 14 project that utilizes Tailwind CSS and integrates a video call feature with Clerk for authentication and Stream Video for managing calls.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Configuration Files](#configuration-files)
3. [Components](#components)
4. [Utilities](#utilities)
5. [API Integration](#api-integration)
6. [Styling with Tailwind CSS](#styling-with-tailwind-css)
7. [Sidebar Links and Images](#sidebar-links-and-images)

## Project Structure

The project follows the common structure for a Next.js application. It contains the following directories:

- **pages/**: Contains route files and components that correspond to different pages of the application.
- **components/**: Holds reusable components across the application.
- **app/**: Contains application-wide functionality and layouts.
- **src/**: Contains source code files such as utilities and additional logic.

## Configuration Files

### 1. Tailwind CSS Configuration (tailwind.config.ts)

This file configures Tailwind CSS for the application:

```typescript
import type { Config } from 'tailwindcss';

const config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  // Additional configuration...
};

export default config;
```

- **darkMode:** Enables dark mode based on a class.
- **content:** Specifies where Tailwind should look for class names.
- **theme:** Contains theme configurations such as colors, animations, and keyframes.

### 2. PostCSS Configuration (postcss.config.js)

This file handles PostCSS plugins:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

## Components

### Sidebar Links

The following export provides an array of sidebar links used for navigation:

```typescript
export const sidebarLinks = [
  {
    imgURL: '/icons/Home.svg',
    route: '/',
    label: 'Home',
  },
  // Additional links...
];
```

### Avatar Images

Various avatar images are stored in this array for user profiles or displays:

```typescript
export const avatarImages = [
  '/images/avatar-1.jpeg',
  '/images/avatar-2.jpeg',
  // Additional avatar images...
];
```

## Utilities

### Class Name Merging (utils/classNames.ts)

This utility function combines class names using `clsx` and `tailwind-merge`:

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## API Integration

### Get Calls Hook (hooks/useGetCalls.ts)

This custom hook fetches call data from the Stream Video client:

```typescript
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';

export const useGetCalls = () => {
  const { user } = useUser();
  const client = useStreamVideoClient();
  const [calls, setCalls] = useState<Call[]>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadCalls = async () => {
      if (!client || !user?.id) return;
      // Load calls...
    };

    loadCalls();
  }, [client, user?.id]);
  
  // Return endedCalls and upcomingCalls...
};
```

- **Usage:** This hook manages retrieving calls and categorizing them into ended and upcoming calls, making it easier to access during component rendering.

## Styling with Tailwind CSS

The styling is handled primarily through Tailwind CSS classes, which allow for rapid and responsive design. Custom animations and backgrounds are defined in the Tailwind configuration.

### Example Configuration

```typescript
theme: {
  extend: {
    colors: {
      dark: {
        1: '#1C1F2E',
        // Additional color definitions...
      },
    },
    keyframes: {
      'accordion-down': {
        from: { height: '0' },
        to: { height: 'var(--radix-accordion-content-height)' },
      },
    },
    // Additional configurations...
  },
},
```

## Conclusion

This documentation provides an overview of the project's codebase, focusing on the vital components, configurations, utilities, and API integrations. Developers can refer to this documentation to understand the structure and logic of the codebase better, facilitating smoother collaboration and development.



## Environment Setup Guidelines 

 null
 

Setting up a development environment for your project involving the specified packages requires you to configure Node.js, package managers, and relevant frameworks and libraries. Below are the steps to set up your development environment:

### Prerequisites

1. **Node.js**: Ensure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/).

2. **Package Manager**: You can use npm (included with Node.js) or yarn. This guide will use npm.

### Step 1: Create a New Next.js Project

1. **Open your terminal**.

2. **Create the Next.js project**:
   ```bash
   npx create-next-app@latest your_project_name
   cd your_project_name
   ```

### Step 2: Install the Required Dependencies

Run the following command in your project directory to install all the necessary packages:

```bash
npm install @next/third-parties @shikijs/transformers algoliasearch instantsearch.js next react react-dom react-instantsearch react-instantsearch-nextjs server-only shiki zod
```

This command installs:

- **@next/third-parties**: A package for handling third-party integrations.
- **@shikijs/transformers**: For text transformations.
- **algoliasearch**: The Algolia search client.
- **instantsearch.js**: A frontend library for building search interfaces with Algolia.
- **next**: The Next.js framework.
- **react & react-dom**: For building the UI.
- **react-instantsearch**: React bindings for Algolia's InstantSearch.
- **react-instantsearch-nextjs**: This is optimized for Next.js.
- **server-only**: To handle server-side logic.
- **shiki**: A syntax highlighter for code.
- **zod**: A TypeScript-first schema declaration and validation library.

### Step 3: Configure Your Project

1. **Setup your Next.js Application**: 

   Open `pages/index.js` in your project directory and set up a basic layout. For example:

   ```javascript
   import Head from 'next/head';
   
   export default function Home() {
       return (
           <div>
               <Head>
                   <title>Your Project Title</title>
                   <meta name="description" content="Your project description" />
               </Head>
               <main>
                   <h1>Welcome to Your Project</h1>
                   {/* Additional components and implementations */}
               </main>
           </div>
       );
   }
   ```

2. **Setup Algolia**: 

   You’ll need to create an Algolia account and obtain your Application ID and Search-Only API Key. Store these in environment variables or a config file.

   Create a `.env.local` file at the root of your project:

   ```env
   NEXT_PUBLIC_ALGOLIA_APP_ID=your_algolia_app_id
   NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your_algolia_search_key
   ```

### Step 4: Create Basic Components

1. **Create Search Component**: 

   Create a new file in `components/Search.js` for your search functionality.

   ```javascript
   import { InstantSearch, SearchBox, Hits } from 'react-instantsearch-dom';
   import algoliasearch from 'algoliasearch/lite';

   const searchClient = algoliasearch(
       process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
       process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
   );

   const Search = () => {
       return (
           <InstantSearch searchClient={searchClient} indexName="your_index_name">
               <SearchBox />
               <Hits />
           </InstantSearch>
       );
   };

   export default Search;
   ```

2. **Integrate Search Component**:

   Integrate your Search component in your `pages/index.js`:

   ```javascript
   import Search from '../components/Search';

   export default function Home() {
       return (
           <div>
               <Head>
                   <title>Your Project Title</title>
                   <meta name="description" content="Your project description" />
               </Head>
               <main>
                   <h1>Welcome to Your Project</h1>
                   <Search />
               </main>
           </div>
       );
   }
   ```

### Step 5: Run Your Application

1. **Run Development Server**:
   ```bash
   npm run dev
   ```

2. **Access the Application**: Open your browser and navigate to `http://localhost:3000` to view your application.

### Step 6: Code Validation with Zod

You can start using Zod for validation in your components or API routes. For example:

```javascript
import { z } from 'zod';

const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
});

// Example usage
const data = schema.parse({ name: "John Doe", email: "john@example.com" });
```

### Conclusion

You have now set up a development environment for your Next.js project with the specified dependencies. You can extend your application by building more components, adding styling, handling state management, and integrating backend services as needed.

```md
# Project Documentation

## Routing

This section provides an overview of the routing implementation in the project using Next.js 14. In Next.js, routing is file-based, meaning the directory structure in the project will dictate the routes available in the application.

### Example Route

```javascript
import { Boundary } from "@/app/_components/boundary";
import { Link } from "@/app/_components/link";

export default function Page() {
  return (
    <Boundary label="Root Page" textCenter filePath="page.tsx">
      <Link href="/examples/template/child">go to the child page</Link>
    </Boundary>
  );
}
```

#### Breakdown:

- **Imports**: 
  - We import the `Boundary` component from the `_components/boundary` directory. This component is likely used for layout and error boundaries, making it easier to manage UI components and handle potential rendering issues.
  - The `Link` component is imported from the `_components/link` directory, facilitating client-side navigation without full page reloads.

- **Functional Component**: 
  - The `Page` function defines a React component that represents a route. This component will render when the user navigates to the corresponding URL, determined by its file path (`page.tsx`).

- **Boundary Component**: 
  - The `Boundary` component is utilized here with the properties:
    - `label`: This is a string that could be used as a title or identifier for the rendered content.
    - `textCenter`: A boolean that likely controls the CSS styles applied to center the text.
    - `filePath`: This property indicates the location of the current file, which can be useful for debugging or documentation purposes.

- **Navigation**:
  - Inside the `Boundary`, there is a `Link` component that navigates to `/examples/template/child`. Clicking this link will take the user to the specified child page while maintaining the application's single-page application (SPA) behavior.

### URL Structure
- The URL structure is nested based on the component directory. For example, the current page is rendered at the root path, while the child page can be accessed at `/examples/template/child`.

### Adding New Routes
- To add a new route, you can create a new file in the appropriate directory following the Next.js file-based routing convention. For instance, a new file named `new-page.tsx` in the `examples/template/` folder would automatically create a route accessible at `/examples/template/new-page`.

## Components Overview

### Boundary Component
- **Location**: `@/app/_components/boundary`
- **Purpose**: Provides a structural boundary for layout management and error handling.
- **Props**:
  - `label`: Used as a title or descriptor for the boundary section.
  - `textCenter`: Centers content within the boundary if set to true.
  - `filePath`: Indicates the path of the component file for debugging purposes.

### Link Component
- **Location**: `@/app/_components/link`
- **Purpose**: Facilitates navigation between different pages of the application without a full reload, enhancing performance and user experience.
- **Props**:
  - `href`: Defines the destination URL/path that the link navigates to.

## Conclusion
This documentation aims to help developers understand the routing mechanism in place, along with details about the components used in the routing structure. As you work within the codebase, referring to this documentation will clarify how to add, modify, or navigate the project's structure more effectively.
```

# Code Documentation

This documentation provides a comprehensive overview of the components and API calls within the React and Next.js project, enabling developers to better understand the codebase structure and functionality. 

## Components

### Client Component
```tsx
"use client";

import type { User } from "../api";

type Props = Partial<User>;

export function Client({ id, name, password }: Props) {
  return (
    <div className="flex flex-col gap-2 text-gray-300">
      <p>id: {id}</p>
      <p>name: {name}</p>
      <p>password: {password}</p>
    </div>
  );
}
```
- **Description**: Displays user information such as id, name, and password in a styled format.
- **Props**: 
  - `id`: Optional user identifier
  - `name`: Optional user name
  - `password`: Optional user password

---

### ImageList Component
```tsx
import Link from "next/link";
import type { PropsWithChildren } from "react";

export function ImageList({ children }: PropsWithChildren) {
  return <div className="flex gap-5">{children}</div>;
}
```
- **Description**: A container for displaying a list of images in a flexible layout.
- **Props**:
  - `children`: React nodes representing individual images or image elements.

---

### ImageBox Component
```tsx
import type { PropsWithChildren } from "react";

export function ImageBox({ children }: PropsWithChildren) {
  return (
    <div className="w-24 h-24 rounded-md flex items-center justify-center">
      {children}
    </div>
  );
}
```
- **Description**: A styled box for containing individual images with a fixed size and rounded corners.
- **Props**:
  - `children`: React nodes representing the content inside the box.

---

### ImageItem Component
```tsx
export function ImageItem({
  id,
  thumbnail,
}: {
  id: number;
  thumbnail: string;
}) {
  return (
    <Link href={`/examples/shopping/foods/${id}`}>
      <ImageBox>
        <div className="w-full h-full flex items-center justify-center bg-gray-600 rounded-md">
          <span className="text-3xl">{thumbnail}</span>
        </div>
      </ImageBox>
    </Link>
  );
}
```
- **Description**: Represents an individual image item that is clickable and navigates to a detailed page when clicked.
- **Props**:
  - `id`: Unique identifier for the image.
  - `thumbnail`: Image thumbnail representation.

---

### Layout Component
```tsx
import type { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return children;
}
```
- **Description**: A simple wrapper component that renders its children, primarily used for layout structuring.

---

### Router Cache Layout Component
```tsx
"use client";

import { Button } from "@/app/_components/button";
import { useMonitorRSCPayload } from "@/app/_hooks/useMonitorRSCPayload";
import { useRouter } from "next/navigation";
import { type PropsWithChildren, useEffect, useState } from "react";
import { TITLES } from "./constants";

const path = "/examples/router-cache";

export default function Layout({ children }: PropsWithChildren) {
  const { logs } = useMonitorRSCPayload(path);
  const [, setTime] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((time) => time + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div>
      <div className="flex justify-end">
        <Button onClick={() => router.refresh()}>force purge cache</Button>
      </div>
      <div className="mt-2 flex gap-2 max-h-80 overflow-x-auto">
        <div className="w-1/2 h-full">{children}</div>
        <ul className="w-1/2 overflow-y-auto divide-y divide-gray-500 text-gray-400">
          {logs.map(({ path, createdAt, isNew }) => (
            <li
              key={`${path}_${createdAt}`}
              className={[isNew ? "animate-[router-cache-highlight_2s_ease-in-out_1]" : ""].join(" ")}
            >
              <p className="text-right">
                {(performance.now() - createdAt) / 1000} s
              </p>
              <p className="text-sm font-semibold">
                {TITLES[Number(path)] ?? "/"}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```
- **Description**: A more complex layout component that handles cache management while providing a refresh button and a log of cache activity.
- **Props**:
  - `children`: React nodes representing the content to be displayed within the layout.

---

### MetaList Component
```tsx
"use client";

import { useGetMeta } from "../_hooks/useGetMeta";

type Props = {
  path: string;
  showOnlyImage?: boolean;
};

export function MetaList({ path, showOnlyImage }: Props) {
  const { meta } = useGetMeta(path);

  if (!meta) {
    return null;
  }

  const data = Object.fromEntries(
    Object.entries(meta).filter(([key]) =>
      showOnlyImage ? key.startsWith("og:image") : true,
    ),
  );

  return (
    <div className="space-y-2 text-sm">
      {Object.entries(data).map(([key, value]) => (
        <div className="flex gap-5 justify-between" key={key}>
          <span className="text-gray-400">{key}</span>
          {key === "og:image" && value ? (
            <img src={value} alt="og-image-sample" className="w-44" />
          ) : (
            <span className="truncate" title={value ?? ""}>
              {value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```
- **Description**: Displays metadata for a specific path, optionally filtering to show only image-related metadata.
- **Props**:
  - `path`: The path for which to retrieve metadata.
  - `showOnlyImage`: A boolean flag that determines whether to display only image-related metadata.

---

## API Calls
*Note: The API calls are implied to be included in the components but are not explicitly shown in the provided snippets. They may involve fetching user data, image data, or metadata based on the context of the components.*

For further exploration of the API endpoints, developers should refer to the API specification documentation to identify the endpoints and their respective request/response structures.

---

This documentation should serve as a guide for developers navigating the codebase, understanding the architecture of components, and recognizing how they interact with each other within the Next.js application.


# Project Documentation




## Local Setup Guidelines

1. Clone the repository:
   ```bash
   git clone your-repo-url
   cd D:\SLIIT\Research\AI-Powered-Integrated-Code-Analyzer-for-Efficient-Developer-WorkFlow\docai\repositories\nextjs-app-router-training
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
  

# Project Code Documentation

## Overview
This documentation provides an overview of the project's codebase, focusing on routing and configuration in the context of a Next.js 14 application. It aims to help developers understand the project's structure and routing logic effectively.

## Routing Configuration

In Next.js, routing is a crucial aspect of creating a dynamic web application. The configuration provided below illustrates how to set up routing and some experimental features in a Next.js project.

### Configuration Code

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // logging: {
  //   fetches: {
  //     fullUrl: true,
  //   },
  // },
  experimental: {
    dynamicIO: true,
    taint: true,
    // typedRoutes: true,
  },
  async redirects() {
    return [
      {
        // fetching
        source: "/examples/caching-data",
        destination: "/examples/data-cache/fetch",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

### Configuration Breakdown

- **Logging Configuration (Commented Out)**:
  - This section contains a commented-out configuration for logging fetch requests. When enabled, it would log the full URLs of fetches made in the application.

- **Experimental Features**:
  - `dynamicIO`: Enables dynamic input/output capabilities within the application.
  - `taint`: A flag for enabling security features related to input validation.
  - `typedRoutes`: This feature is commented out but can be enabled to provide better type safety for routes in TypeScript. Uncommenting can improve development experience and reduce runtime errors.

### Redirects

The `redirects` function allows for defining rules to redirect users from one route to another:

```typescript
async redirects() {
  return [
    {
      // This redirect sends requests from "/examples/caching-data" to "/examples/data-cache/fetch"
      source: "/examples/caching-data",
      destination: "/examples/data-cache/fetch",
      permanent: true,
    },
  ];
}
```

- **Redirect Rule**:
  - `source`: The URL path that users will navigate to initially.
  - `destination`: The URL path to which users will be redirected.
  - `permanent`: A boolean flag indicating whether the redirect is permanent. When set to `true`, it returns a 308 status code, indicating that the resource has been moved permanently.

## Summary

This configuration provides a foundational setup for routing and enhances the application by leveraging experimental features in Next.js 14. Developers can easily adapt the routing rules and enable specific experimental features as necessary to suit the project's needs. Understanding this configuration is vital for effective navigation and resource management within the application.

# Project Codebase Documentation

## Overview

This documentation provides a detailed overview of the codebase for the Next.js 14 project, describing the components, their purposes, and how they interact. Each component is explained with functional details and usage examples to facilitate understanding and further development.

---

## Components

### Client

```javascript
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

#### Description
The `Client` component displays user details such as `id`, `name`, and `password`. It accepts a props object, which can contain any combination of the `User` fields.

#### Props
- `id` (Optional): The ID of the user.
- `name` (Optional): The name of the user.
- `password` (Optional): The password of the user (sensitive information).

--- 

### ImageList

```javascript
import Link from "next/link";
import type { PropsWithChildren } from "react";

export function ImageList({ children }: PropsWithChildren) {
  return <div className="flex gap-5">{children}</div>;
}
```

#### Description
The `ImageList` component serves as a container for a list of image items, using Flexbox for layout.

#### Props
- `children`: This allows nesting image items within the `ImageList`.

---

### ImageBox

```javascript
export function ImageBox({ children }: PropsWithChildren) {
  return (
    <div className="w-24 h-24 rounded-md flex items-center justify-center">
      {children}
    </div>
  );
}
```

#### Description
The `ImageBox` component acts as a styled container for images, providing a designated width and height, along with centering styles.

---

### ImageItem

```javascript
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

#### Description
The `ImageItem` component generates a link to a specific food item, displaying a thumbnail within an `ImageBox`. It utilizes the `Link` component from Next.js for client-side transitions.

#### Props
- `id`: A unique identifier for the food item.
- `thumbnail`: The image identifier or representation for the food.

---

### Layout

```javascript
import type { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return children;
}
```

#### Description
The `Layout` component provides a simple render layer for any child components without additional styling or structures.

---

### Advanced Layout with Router Cache Logging

```javascript
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

#### Description
This `Layout` component manages router cache logs and provides a button to forcefully refresh the cache. It also displays logs about the paths accessed and the time taken since their creation.

#### Props
- `children`: Nest any child components that need to be wrapped within this layout.

---

### MetaList

```javascript
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
    Object.entries(meta).filter(([key]) => showOnlyImage ? key.startsWith("og:image") : true),
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

#### Description
The `MetaList` component retrieves and displays metadata about a specific path, offering an option to filter for image representations only.

#### Props
- `path`: The path for which to retrieve metadata.
- `showOnlyImage` (Optional): If true, only display image metadata.

---

## Conclusion
This documentation serves as a guide to understanding the code structure and functionality within the Next.js 14 project. Developers can refer to this as they navigate through the codebase, providing a clearer path for modifications, additions, and maintenance.

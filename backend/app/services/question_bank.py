"""
Pre-generated question bank for instant loading
"""

QUESTION_BANK = {
    "frontend": {
        "beginner": [
            {
                "question": "What is the Virtual DOM in React?",
                "type": "technical",
                "options": [
                    "A) A lightweight copy of the actual DOM that React uses to optimize updates",
                    "B) A database for storing component state",
                    "C) A CSS framework for styling components",
                    "D) A testing library for React applications"
                ],
                "correct_answer": "A) A lightweight copy of the actual DOM that React uses to optimize updates",
                "explanation": "The Virtual DOM is React's optimization technique. It creates a lightweight copy of the DOM in memory, compares changes, and only updates the actual DOM where necessary, making updates faster."
            },
            {
                "question": "Which CSS property is used to create flexible layouts?",
                "type": "technical",
                "options": [
                    "A) display: flex",
                    "B) position: absolute",
                    "C) float: left",
                    "D) margin: auto"
                ],
                "correct_answer": "A) display: flex",
                "explanation": "Flexbox (display: flex) is the modern CSS layout system designed for creating flexible, responsive layouts. It provides powerful alignment and distribution capabilities."
            },
            {
                "question": "What does 'useState' do in React?",
                "type": "technical",
                "options": [
                    "A) Creates a state variable that persists between re-renders",
                    "B) Fetches data from an API",
                    "C) Styles a component",
                    "D) Routes to different pages"
                ],
                "correct_answer": "A) Creates a state variable that persists between re-renders",
                "explanation": "useState is a React Hook that lets you add state to functional components. It returns the current state value and a function to update it."
            },
            {
                "question": "What is the purpose of the 'key' prop in React lists?",
                "type": "technical",
                "options": [
                    "A) Helps React identify which items have changed, added, or removed",
                    "B) Encrypts sensitive data",
                    "C) Sets the primary key in a database",
                    "D) Defines CSS class names"
                ],
                "correct_answer": "A) Helps React identify which items have changed, added, or removed",
                "explanation": "Keys help React identify which items in a list have changed. This improves performance by allowing React to reuse existing DOM elements instead of recreating them."
            },
            {
                "question": "Which method is used to handle events in JavaScript?",
                "type": "technical",
                "options": [
                    "A) addEventListener()",
                    "B) attachEvent()",
                    "C) bindEvent()",
                    "D) handleEvent()"
                ],
                "correct_answer": "A) addEventListener()",
                "explanation": "addEventListener() is the standard method to attach event handlers to DOM elements. It allows multiple handlers for the same event and provides better control."
            },
            {
                "question": "What is the box model in CSS?",
                "type": "technical",
                "options": [
                    "A) Content, padding, border, and margin that make up an element's total size",
                    "B) A JavaScript framework for animations",
                    "C) A React component library",
                    "D) A database schema design pattern"
                ],
                "correct_answer": "A) Content, padding, border, and margin that make up an element's total size",
                "explanation": "The CSS box model describes how elements are rendered with content, padding, border, and margin. Understanding this is crucial for layout design."
            },
            {
                "question": "What does the 'async' keyword do in JavaScript?",
                "type": "technical",
                "options": [
                    "A) Makes a function return a Promise and allows use of 'await' inside it",
                    "B) Speeds up code execution",
                    "C) Creates a new thread",
                    "D) Synchronizes multiple functions"
                ],
                "correct_answer": "A) Makes a function return a Promise and allows use of 'await' inside it",
                "explanation": "The async keyword declares an asynchronous function that returns a Promise. It enables the use of await for cleaner asynchronous code."
            },
            {
                "question": "What is the purpose of useEffect in React?",
                "type": "technical",
                "options": [
                    "A) Performs side effects like data fetching, subscriptions, or DOM manipulation",
                    "B) Creates CSS effects and animations",
                    "C) Validates form inputs",
                    "D) Manages routing between pages"
                ],
                "correct_answer": "A) Performs side effects like data fetching, subscriptions, or DOM manipulation",
                "explanation": "useEffect is a React Hook for handling side effects in functional components. It runs after render and can clean up when the component unmounts."
            },
            {
                "question": "What is event bubbling in JavaScript?",
                "type": "technical",
                "options": [
                    "A) When an event propagates from the target element up through its ancestors",
                    "B) When events are queued in memory",
                    "C) When multiple events fire simultaneously",
                    "D) When events are cancelled"
                ],
                "correct_answer": "A) When an event propagates from the target element up through its ancestors",
                "explanation": "Event bubbling is when an event starts at the target element and propagates up through parent elements. This allows event delegation patterns."
            },
            {
                "question": "What is the difference between '==' and '===' in JavaScript?",
                "type": "technical",
                "options": [
                    "A) '===' checks both value and type, '==' only checks value with type coercion",
                    "B) They are exactly the same",
                    "C) '==' is faster than '==='",
                    "D) '===' only works with numbers"
                ],
                "correct_answer": "A) '===' checks both value and type, '==' only checks value with type coercion",
                "explanation": "The strict equality operator (===) checks both value and type without conversion. The loose equality (==) performs type coercion before comparison."
            }
        ],
        "intermediate": [
            {
                "question": "What is the difference between useEffect and useLayoutEffect?",
                "type": "technical",
                "options": [
                    "A) useLayoutEffect runs synchronously after DOM mutations, useEffect runs asynchronously",
                    "B) useLayoutEffect is for styling, useEffect is for data fetching",
                    "C) They are exactly the same",
                    "D) useLayoutEffect only works in class components"
                ],
                "correct_answer": "A) useLayoutEffect runs synchronously after DOM mutations, useEffect runs asynchronously",
                "explanation": "useLayoutEffect fires synchronously after all DOM mutations but before the browser paints. This is useful for measuring DOM elements or preventing visual flicker."
            },
            {
                "question": "What is closure in JavaScript?",
                "type": "technical",
                "options": [
                    "A) A function that has access to variables from its outer scope even after the outer function has returned",
                    "B) A way to close browser windows",
                    "C) A CSS property for hiding elements",
                    "D) A method to end a loop"
                ],
                "correct_answer": "A) A function that has access to variables from its outer scope even after the outer function has returned",
                "explanation": "Closures allow functions to access variables from their lexical scope even after the outer function has finished executing. This is fundamental to JavaScript's function scope."
            },
            {
                "question": "What is the purpose of React Context API?",
                "type": "technical",
                "options": [
                    "A) Share data across components without prop drilling",
                    "B) Manage component lifecycle",
                    "C) Handle routing",
                    "D) Optimize performance"
                ],
                "correct_answer": "A) Share data across components without prop drilling",
                "explanation": "Context API provides a way to pass data through the component tree without manually passing props at every level, solving the prop drilling problem."
            },
            {
                "question": "What is debouncing in JavaScript?",
                "type": "technical",
                "options": [
                    "A) Delaying function execution until after a specified time has passed since the last call",
                    "B) Removing bugs from code",
                    "C) Optimizing database queries",
                    "D) Compressing JavaScript files"
                ],
                "correct_answer": "A) Delaying function execution until after a specified time has passed since the last call",
                "explanation": "Debouncing limits the rate at which a function executes by waiting for a pause in events. Commonly used for search inputs and resize handlers."
            },
            {
                "question": "What is the purpose of useMemo in React?",
                "type": "technical",
                "options": [
                    "A) Memoizes expensive computations to avoid recalculating on every render",
                    "B) Stores data in browser memory",
                    "C) Creates memos for developers",
                    "D) Manages component state"
                ],
                "correct_answer": "A) Memoizes expensive computations to avoid recalculating on every render",
                "explanation": "useMemo caches the result of expensive calculations and only recalculates when dependencies change, improving performance."
            },
            {
                "question": "What is the difference between controlled and uncontrolled components in React?",
                "type": "technical",
                "options": [
                    "A) Controlled components have their state managed by React, uncontrolled use DOM refs",
                    "B) Controlled components are faster",
                    "C) Uncontrolled components are deprecated",
                    "D) There is no difference"
                ],
                "correct_answer": "A) Controlled components have their state managed by React, uncontrolled use DOM refs",
                "explanation": "Controlled components store form data in React state with onChange handlers. Uncontrolled components store data in the DOM and use refs to access values."
            },
            {
                "question": "What is the purpose of useCallback in React?",
                "type": "technical",
                "options": [
                    "A) Memoizes callback functions to prevent unnecessary re-renders of child components",
                    "B) Handles API callbacks",
                    "C) Creates event listeners",
                    "D) Manages async operations"
                ],
                "correct_answer": "A) Memoizes callback functions to prevent unnecessary re-renders of child components",
                "explanation": "useCallback returns a memoized version of a callback that only changes if dependencies change, preventing unnecessary child component re-renders."
            },
            {
                "question": "What is the Shadow DOM?",
                "type": "technical",
                "options": [
                    "A) An encapsulated DOM tree attached to an element, isolated from the main document",
                    "B) A backup copy of the DOM",
                    "C) A dark theme for web pages",
                    "D) A deprecated browser feature"
                ],
                "correct_answer": "A) An encapsulated DOM tree attached to an element, isolated from the main document",
                "explanation": "Shadow DOM provides encapsulation for web components, keeping markup, styles, and behavior hidden and separate from other code on the page."
            },
            {
                "question": "What is lazy loading in React?",
                "type": "technical",
                "options": [
                    "A) Loading components only when they are needed using React.lazy() and Suspense",
                    "B) Slow loading of all components",
                    "C) Loading data from APIs",
                    "D) Delaying state updates"
                ],
                "correct_answer": "A) Loading components only when they are needed using React.lazy() and Suspense",
                "explanation": "Lazy loading splits code into smaller chunks and loads components on demand, reducing initial bundle size and improving performance."
            },
            {
                "question": "What is the purpose of the 'this' keyword in JavaScript?",
                "type": "technical",
                "options": [
                    "A) Refers to the object that is executing the current function",
                    "B) Creates a new variable",
                    "C) Imports modules",
                    "D) Defines constants"
                ],
                "correct_answer": "A) Refers to the object that is executing the current function",
                "explanation": "The 'this' keyword refers to the context in which a function is called. Its value depends on how the function is invoked."
            }
        ],
        "advanced": [
            {
                "question": "How would you optimize a React application with large lists?",
                "type": "problem_solving",
                "options": [
                    "A) Use React.memo, virtualization (react-window), and pagination",
                    "B) Remove all state management",
                    "C) Use only class components",
                    "D) Disable React DevTools"
                ],
                "correct_answer": "A) Use React.memo, virtualization (react-window), and pagination",
                "explanation": "For large lists, combine React.memo to prevent unnecessary re-renders, virtualization to render only visible items, and pagination to limit data loaded at once."
            },
            {
                "question": "What is the difference between server-side rendering (SSR) and client-side rendering (CSR)?",
                "type": "technical",
                "options": [
                    "A) SSR renders HTML on the server, CSR renders in the browser using JavaScript",
                    "B) SSR is always faster",
                    "C) CSR requires a server",
                    "D) They are the same"
                ],
                "correct_answer": "A) SSR renders HTML on the server, CSR renders in the browser using JavaScript",
                "explanation": "SSR generates HTML on the server for better SEO and initial load. CSR renders everything in the browser, providing better interactivity after initial load."
            },
            {
                "question": "What is the purpose of Web Workers?",
                "type": "technical",
                "options": [
                    "A) Run JavaScript in background threads without blocking the main UI thread",
                    "B) Manage website employees",
                    "C) Handle CSS animations",
                    "D) Store data in localStorage"
                ],
                "correct_answer": "A) Run JavaScript in background threads without blocking the main UI thread",
                "explanation": "Web Workers allow running scripts in background threads, enabling heavy computations without freezing the UI."
            },
            {
                "question": "What is tree shaking in JavaScript?",
                "type": "technical",
                "options": [
                    "A) Removing unused code from the final bundle during build process",
                    "B) Organizing code in tree structures",
                    "C) Testing DOM manipulation",
                    "D) Animating tree components"
                ],
                "correct_answer": "A) Removing unused code from the final bundle during build process",
                "explanation": "Tree shaking is a dead code elimination technique that removes unused exports from modules, reducing bundle size."
            },
            {
                "question": "How would you implement code splitting in a React application?",
                "type": "problem_solving",
                "options": [
                    "A) Use React.lazy() with dynamic import() and Suspense for route-based splitting",
                    "B) Split files manually into multiple folders",
                    "C) Use only one large bundle",
                    "D) Avoid using any bundler"
                ],
                "correct_answer": "A) Use React.lazy() with dynamic import() and Suspense for route-based splitting",
                "explanation": "Code splitting divides your bundle into smaller chunks loaded on demand. React.lazy() with dynamic imports and Suspense provides an elegant solution."
            },
            {
                "question": "What is the purpose of Service Workers?",
                "type": "technical",
                "options": [
                    "A) Enable offline functionality, caching, and background sync for Progressive Web Apps",
                    "B) Manage server-side code",
                    "C) Handle CSS preprocessing",
                    "D) Compile TypeScript"
                ],
                "correct_answer": "A) Enable offline functionality, caching, and background sync for Progressive Web Apps",
                "explanation": "Service Workers are scripts that run in the background, enabling features like offline support, push notifications, and background sync for PWAs."
            },
            {
                "question": "What is the difference between imperative and declarative programming in React?",
                "type": "technical",
                "options": [
                    "A) Declarative describes what to render, imperative describes how to do it step-by-step",
                    "B) Imperative is always better",
                    "C) Declarative is only for CSS",
                    "D) They mean the same thing"
                ],
                "correct_answer": "A) Declarative describes what to render, imperative describes how to do it step-by-step",
                "explanation": "React uses declarative programming where you describe the UI state, and React handles the DOM updates. Imperative code explicitly describes each step."
            },
            {
                "question": "How would you prevent memory leaks in React?",
                "type": "problem_solving",
                "options": [
                    "A) Clean up subscriptions, timers, and event listeners in useEffect cleanup function",
                    "B) Restart the browser regularly",
                    "C) Use only functional components",
                    "D) Avoid using state"
                ],
                "correct_answer": "A) Clean up subscriptions, timers, and event listeners in useEffect cleanup function",
                "explanation": "Memory leaks occur when resources aren't released. Always return a cleanup function from useEffect to cancel subscriptions, clear timers, and remove listeners."
            },
            {
                "question": "What is the purpose of the Intersection Observer API?",
                "type": "technical",
                "options": [
                    "A) Asynchronously observe changes in the intersection of a target element with an ancestor or viewport",
                    "B) Find intersections in mathematical graphs",
                    "C) Merge multiple arrays",
                    "D) Handle click events"
                ],
                "correct_answer": "A) Asynchronously observe changes in the intersection of a target element with an ancestor or viewport",
                "explanation": "Intersection Observer API provides an efficient way to detect when elements enter/exit the viewport, useful for lazy loading and infinite scroll."
            },
            {
                "question": "What is hydration in React?",
                "type": "technical",
                "options": [
                    "A) Attaching event listeners to server-rendered HTML to make it interactive",
                    "B) Adding water to components",
                    "C) Loading data from APIs",
                    "D) Compressing component code"
                ],
                "correct_answer": "A) Attaching event listeners to server-rendered HTML to make it interactive",
                "explanation": "Hydration is the process where React attaches event handlers and makes server-rendered HTML interactive on the client side."
            }
        ]
    },
    "backend": {
        "beginner": [
            {"question": "What is REST API?", "type": "technical", "options": ["A) An architectural style for building web services using HTTP methods", "B) A database management system", "C) A programming language", "D) A frontend framework"], "correct_answer": "A) An architectural style for building web services using HTTP methods", "explanation": "REST (Representational State Transfer) is an architectural style that uses standard HTTP methods (GET, POST, PUT, DELETE) to create scalable web services."},
            {"question": "What HTTP status code indicates a successful request?", "type": "technical", "options": ["A) 200 OK", "B) 404 Not Found", "C) 500 Internal Server Error", "D) 301 Moved Permanently"], "correct_answer": "A) 200 OK", "explanation": "HTTP 200 OK indicates that the request was successful. Other 2xx codes also indicate success, but 200 is the most common."},
            {"question": "What is JSON?", "type": "technical", "options": ["A) JavaScript Object Notation - a lightweight data interchange format", "B) A programming language", "C) A database", "D) A web server"], "correct_answer": "A) JavaScript Object Notation - a lightweight data interchange format", "explanation": "JSON is a text-based format for representing structured data based on JavaScript object syntax, commonly used for APIs."},
            {"question": "What is the purpose of HTTP GET method?", "type": "technical", "options": ["A) Retrieve data from a server without modifying it", "B) Create new resources", "C) Update existing resources", "D) Delete resources"], "correct_answer": "A) Retrieve data from a server without modifying it", "explanation": "GET is used to request data from a specified resource. It should only retrieve data and have no other effect."},
            {"question": "What is a database primary key?", "type": "technical", "options": ["A) A unique identifier for each record in a table", "B) The first column in a table", "C) A password for database access", "D) A backup key"], "correct_answer": "A) A unique identifier for each record in a table", "explanation": "A primary key uniquely identifies each record in a database table and cannot contain NULL values."},
            {"question": "What is SQL?", "type": "technical", "options": ["A) Structured Query Language for managing relational databases", "B) A programming language for web development", "C) A server operating system", "D) A cloud platform"], "correct_answer": "A) Structured Query Language for managing relational databases", "explanation": "SQL is a standard language for storing, manipulating, and retrieving data in relational databases."},
            {"question": "What is the difference between POST and PUT?", "type": "technical", "options": ["A) POST creates new resources, PUT updates existing ones", "B) They are exactly the same", "C) POST is faster", "D) PUT is deprecated"], "correct_answer": "A) POST creates new resources, PUT updates existing ones", "explanation": "POST is typically used to create new resources, while PUT is used to update existing resources or create if it doesn't exist."},
            {"question": "What is an API endpoint?", "type": "technical", "options": ["A) A specific URL where an API can access resources", "B) The end of a program", "C) A database connection", "D) A server location"], "correct_answer": "A) A specific URL where an API can access resources", "explanation": "An API endpoint is a specific URL where an API can be accessed by a client application to perform operations."},
            {"question": "What is authentication?", "type": "technical", "options": ["A) Verifying the identity of a user or system", "B) Encrypting data", "C) Backing up databases", "D) Optimizing queries"], "correct_answer": "A) Verifying the identity of a user or system", "explanation": "Authentication is the process of verifying that someone or something is who they claim to be."},
            {"question": "What is a foreign key in databases?", "type": "technical", "options": ["A) A field that links to the primary key of another table", "B) A key from another country", "C) An encrypted key", "D) A backup key"], "correct_answer": "A) A field that links to the primary key of another table", "explanation": "A foreign key is a field in one table that refers to the primary key in another table, creating a relationship between tables."}
        ],
        "intermediate": [
            {"question": "What is the purpose of database indexing?", "type": "technical", "options": ["A) To speed up data retrieval operations at the cost of slower writes", "B) To encrypt sensitive data", "C) To backup the database", "D) To delete old records"], "correct_answer": "A) To speed up data retrieval operations at the cost of slower writes", "explanation": "Database indexes create a data structure that improves query performance. However, they require additional storage and slow down INSERT/UPDATE operations."},
            {"question": "What is middleware in backend development?", "type": "technical", "options": ["A) Software that sits between the request and response, processing data", "B) The middle layer of a database", "C) A type of server", "D) A frontend framework"], "correct_answer": "A) Software that sits between the request and response, processing data", "explanation": "Middleware functions have access to request and response objects and can execute code, modify them, or end the request-response cycle."},
            {"question": "What is JWT?", "type": "technical", "options": ["A) JSON Web Token - a compact token for authentication", "B) JavaScript Web Technology", "C) Java Web Toolkit", "D) JSON Web Template"], "correct_answer": "A) JSON Web Token - a compact token for authentication", "explanation": "JWT is a standard for securely transmitting information between parties as a JSON object, commonly used for authentication."},
            {"question": "What is the difference between SQL and NoSQL databases?", "type": "technical", "options": ["A) SQL uses structured tables, NoSQL uses flexible document/key-value stores", "B) SQL is newer", "C) NoSQL is always faster", "D) They are the same"], "correct_answer": "A) SQL uses structured tables, NoSQL uses flexible document/key-value stores", "explanation": "SQL databases use structured schemas with tables and relationships. NoSQL databases offer flexible schemas with various data models."},
            {"question": "What is CORS?", "type": "technical", "options": ["A) Cross-Origin Resource Sharing - a security mechanism for web requests", "B) A database query language", "C) A server framework", "D) A caching strategy"], "correct_answer": "A) Cross-Origin Resource Sharing - a security mechanism for web requests", "explanation": "CORS is a security feature that allows or restricts web applications running at one origin to access resources from a different origin."},
            {"question": "What is database normalization?", "type": "technical", "options": ["A) Organizing data to reduce redundancy and improve integrity", "B) Making all data the same format", "C) Backing up databases", "D) Encrypting data"], "correct_answer": "A) Organizing data to reduce redundancy and improve integrity", "explanation": "Normalization is the process of organizing database tables to minimize redundancy and dependency by dividing large tables into smaller ones."},
            {"question": "What is caching?", "type": "technical", "options": ["A) Storing frequently accessed data in fast-access memory for quick retrieval", "B) Deleting old data", "C) Encrypting data", "D) Backing up data"], "correct_answer": "A) Storing frequently accessed data in fast-access memory for quick retrieval", "explanation": "Caching stores copies of frequently accessed data in fast-access storage to reduce database load and improve response times."},
            {"question": "What is an ORM?", "type": "technical", "options": ["A) Object-Relational Mapping - converts data between incompatible type systems", "B) Online Resource Manager", "C) Operating Resource Module", "D) Object Rendering Method"], "correct_answer": "A) Object-Relational Mapping - converts data between incompatible type systems", "explanation": "ORM is a technique that lets you query and manipulate data from a database using an object-oriented paradigm."},
            {"question": "What is the purpose of environment variables?", "type": "technical", "options": ["A) Store configuration and secrets outside of code", "B) Control room temperature", "C) Manage user sessions", "D) Cache database queries"], "correct_answer": "A) Store configuration and secrets outside of code", "explanation": "Environment variables store configuration settings and sensitive data like API keys outside the codebase for security and flexibility."},
            {"question": "What is a transaction in databases?", "type": "technical", "options": ["A) A sequence of operations performed as a single logical unit of work", "B) A payment operation", "C) A data transfer", "D) A backup operation"], "correct_answer": "A) A sequence of operations performed as a single logical unit of work", "explanation": "A database transaction is a unit of work that either completely succeeds or completely fails, ensuring data consistency."}
        ],
        "advanced": [
            {"question": "How would you design a rate limiting system for an API?", "type": "system_design", "options": ["A) Use token bucket or sliding window algorithm with Redis for distributed systems", "B) Block all requests after 100 calls", "C) Use only client-side validation", "D) Disable rate limiting in production"], "correct_answer": "A) Use token bucket or sliding window algorithm with Redis for distributed systems", "explanation": "Token bucket or sliding window algorithms provide flexible rate limiting. Redis is ideal for distributed systems as it provides fast, shared state across multiple servers."},
            {"question": "What is database sharding?", "type": "technical", "options": ["A) Horizontally partitioning data across multiple databases", "B) Breaking databases into pieces", "C) Encrypting database content", "D) Backing up databases"], "correct_answer": "A) Horizontally partitioning data across multiple databases", "explanation": "Sharding distributes data across multiple databases to improve performance and scalability by reducing the load on any single database."},
            {"question": "What is the CAP theorem?", "type": "technical", "options": ["A) A distributed system can only guarantee 2 of 3: Consistency, Availability, Partition tolerance", "B) A caching strategy", "C) A programming paradigm", "D) A security protocol"], "correct_answer": "A) A distributed system can only guarantee 2 of 3: Consistency, Availability, Partition tolerance", "explanation": "CAP theorem states that distributed systems can only simultaneously provide two of three guarantees: Consistency, Availability, and Partition tolerance."},
            {"question": "What is event-driven architecture?", "type": "technical", "options": ["A) System design where components communicate through events and message queues", "B) Programming based on user clicks", "C) A database design pattern", "D) A frontend framework"], "correct_answer": "A) System design where components communicate through events and message queues", "explanation": "Event-driven architecture uses events to trigger and communicate between decoupled services, enabling scalability and flexibility."},
            {"question": "How would you handle database connection pooling?", "type": "problem_solving", "options": ["A) Maintain a pool of reusable connections with min/max limits and timeout settings", "B) Create new connection for each request", "C) Use only one connection for all requests", "D) Avoid using databases"], "correct_answer": "A) Maintain a pool of reusable connections with min/max limits and timeout settings", "explanation": "Connection pooling reuses database connections instead of creating new ones for each request, significantly improving performance."},
            {"question": "What is the purpose of message queues?", "type": "technical", "options": ["A) Asynchronous communication between services with guaranteed delivery", "B) Storing user messages", "C) Caching data", "D) Encrypting communications"], "correct_answer": "A) Asynchronous communication between services with guaranteed delivery", "explanation": "Message queues enable asynchronous communication between services, providing reliability, scalability, and decoupling."},
            {"question": "What is database replication?", "type": "technical", "options": ["A) Copying data from one database to another for redundancy and performance", "B) Duplicating code", "C) Backing up files", "D) Encrypting data"], "correct_answer": "A) Copying data from one database to another for redundancy and performance", "explanation": "Database replication maintains multiple copies of data across different servers for high availability, disaster recovery, and read scalability."},
            {"question": "How would you implement API versioning?", "type": "problem_solving", "options": ["A) Use URL versioning (/v1/), header versioning, or query parameters", "B) Never version APIs", "C) Delete old versions immediately", "D) Use only one version forever"], "correct_answer": "A) Use URL versioning (/v1/), header versioning, or query parameters", "explanation": "API versioning allows maintaining backward compatibility while evolving the API. Common strategies include URL paths, headers, or query parameters."},
            {"question": "What is the purpose of load balancing?", "type": "technical", "options": ["A) Distribute incoming traffic across multiple servers to improve performance and reliability", "B) Balance database tables", "C) Optimize code", "D) Manage user sessions"], "correct_answer": "A) Distribute incoming traffic across multiple servers to improve performance and reliability", "explanation": "Load balancing distributes network traffic across multiple servers to ensure no single server is overwhelmed, improving availability and performance."},
            {"question": "What is the difference between horizontal and vertical scaling?", "type": "technical", "options": ["A) Horizontal adds more machines, vertical adds more power to existing machines", "B) They are the same", "C) Horizontal is always better", "D) Vertical is deprecated"], "correct_answer": "A) Horizontal adds more machines, vertical adds more power to existing machines", "explanation": "Horizontal scaling (scale out) adds more servers. Vertical scaling (scale up) adds more resources (CPU, RAM) to existing servers."}
        ]
    },
    "data_analyst": {
        "beginner": [
            {
                "question": "What SQL clause is used to filter rows?",
                "type": "technical",
                "options": [
                    "A) WHERE",
                    "B) SELECT",
                    "C) FROM",
                    "D) ORDER BY"
                ],
                "correct_answer": "A) WHERE",
                "explanation": "The WHERE clause filters rows based on specified conditions. It's applied before grouping and aggregation."
            }
        ],
        "intermediate": [
            {
                "question": "What is the difference between INNER JOIN and LEFT JOIN?",
                "type": "technical",
                "options": [
                    "A) INNER JOIN returns only matching rows, LEFT JOIN returns all left table rows plus matches",
                    "B) They are exactly the same",
                    "C) LEFT JOIN is faster",
                    "D) INNER JOIN includes NULL values"
                ],
                "correct_answer": "A) INNER JOIN returns only matching rows, LEFT JOIN returns all left table rows plus matches",
                "explanation": "INNER JOIN returns only rows with matches in both tables. LEFT JOIN returns all rows from the left table, with NULL for non-matching right table columns."
            }
        ],
        "advanced": [
            {
                "question": "How would you detect outliers in a dataset?",
                "type": "problem_solving",
                "options": [
                    "A) Use IQR method, Z-score, or statistical tests like Grubbs' test",
                    "B) Delete all extreme values",
                    "C) Ignore outliers completely",
                    "D) Use only visual inspection"
                ],
                "correct_answer": "A) Use IQR method, Z-score, or statistical tests like Grubbs' test",
                "explanation": "Multiple methods exist for outlier detection: IQR (Interquartile Range) for robust detection, Z-score for normal distributions, and statistical tests for formal hypothesis testing."
            }
        ]
    },
    "devops": {
        "beginner": [
            {
                "question": "What is Docker?",
                "type": "technical",
                "options": [
                    "A) A platform for developing, shipping, and running applications in containers",
                    "B) A programming language",
                    "C) A database system",
                    "D) A cloud provider"
                ],
                "correct_answer": "A) A platform for developing, shipping, and running applications in containers",
                "explanation": "Docker is a containerization platform that packages applications with their dependencies, ensuring consistency across different environments."
            }
        ],
        "intermediate": [
            {
                "question": "What is the purpose of CI/CD pipelines?",
                "type": "technical",
                "options": [
                    "A) Automate building, testing, and deploying code changes",
                    "B) Monitor server performance",
                    "C) Backup databases",
                    "D) Write documentation"
                ],
                "correct_answer": "A) Automate building, testing, and deploying code changes",
                "explanation": "CI/CD (Continuous Integration/Continuous Deployment) pipelines automate the software delivery process, reducing manual errors and speeding up releases."
            }
        ],
        "advanced": [
            {
                "question": "How would you implement zero-downtime deployment?",
                "type": "system_design",
                "options": [
                    "A) Use blue-green deployment or rolling updates with health checks",
                    "B) Take the system offline during deployment",
                    "C) Deploy only at midnight",
                    "D) Disable monitoring during deployment"
                ],
                "correct_answer": "A) Use blue-green deployment or rolling updates with health checks",
                "explanation": "Blue-green deployment maintains two identical environments, switching traffic after validation. Rolling updates gradually replace instances with health checks ensuring availability."
            }
        ]
    },
    "hr": {
        "beginner": [
            {
                "question": "Describe a time when you worked in a team.",
                "type": "behavioral",
                "options": [
                    "A) Use STAR method: Situation, Task, Action, Result to structure your answer",
                    "B) Say you prefer working alone",
                    "C) Criticize your teammates",
                    "D) Avoid giving specific examples"
                ],
                "correct_answer": "A) Use STAR method: Situation, Task, Action, Result to structure your answer",
                "explanation": "The STAR method provides a structured way to answer behavioral questions, ensuring you cover all important aspects of your experience."
            }
        ],
        "intermediate": [
            {
                "question": "How do you handle conflict with a coworker?",
                "type": "behavioral",
                "options": [
                    "A) Address it directly and professionally, focus on finding a solution",
                    "B) Ignore the conflict",
                    "C) Complain to everyone except the person involved",
                    "D) Escalate immediately to management"
                ],
                "correct_answer": "A) Address it directly and professionally, focus on finding a solution",
                "explanation": "Direct, professional communication is key to resolving conflicts. Focus on the issue, not the person, and work collaboratively toward a solution."
            }
        ],
        "advanced": [
            {
                "question": "Tell me about a time you failed and what you learned.",
                "type": "behavioral",
                "options": [
                    "A) Share a genuine failure, explain what you learned, and how you applied that lesson",
                    "B) Say you've never failed",
                    "C) Blame others for the failure",
                    "D) Give a vague, non-specific answer"
                ],
                "correct_answer": "A) Share a genuine failure, explain what you learned, and how you applied that lesson",
                "explanation": "Employers value self-awareness and growth. Sharing a real failure with lessons learned demonstrates maturity and continuous improvement."
            }
        ]
    },
    "fullstack": {
        "beginner": [
            {
                "question": "What is the difference between frontend and backend?",
                "type": "technical",
                "options": [
                    "A) Frontend is client-side (UI), backend is server-side (logic, database)",
                    "B) They are the same thing",
                    "C) Frontend uses only HTML",
                    "D) Backend is only for mobile apps"
                ],
                "correct_answer": "A) Frontend is client-side (UI), backend is server-side (logic, database)",
                "explanation": "Frontend handles what users see and interact with (HTML, CSS, JavaScript). Backend handles business logic, databases, and server operations."
            }
        ],
        "intermediate": [
            {
                "question": "What is JWT and why is it used?",
                "type": "technical",
                "options": [
                    "A) JSON Web Token - a compact, URL-safe token for authentication and information exchange",
                    "B) A database query language",
                    "C) A CSS framework",
                    "D) A testing library"
                ],
                "correct_answer": "A) JSON Web Token - a compact, URL-safe token for authentication and information exchange",
                "explanation": "JWT is a standard for securely transmitting information between parties as a JSON object. It's commonly used for stateless authentication in web applications."
            }
        ],
        "advanced": [
            {
                "question": "How would you design a scalable microservices architecture?",
                "type": "system_design",
                "options": [
                    "A) Use API gateway, service discovery, message queues, and independent databases per service",
                    "B) Put everything in one large application",
                    "C) Use only one database for all services",
                    "D) Avoid using any communication between services"
                ],
                "correct_answer": "A) Use API gateway, service discovery, message queues, and independent databases per service",
                "explanation": "Scalable microservices require: API gateway for routing, service discovery for dynamic addressing, message queues for async communication, and database per service for independence."
            }
        ]
    }
}


def get_instant_question(domain: str, difficulty: str, question_index: int, session_id: int = None) -> dict:
    """Get a pre-generated question instantly without AI call - randomized per session"""
    import random
    
    # Normalize domain name
    domain = domain.lower().strip()
    
    # Get domain questions with fallback
    domain_questions = QUESTION_BANK.get(domain)
    if not domain_questions:
        print(f"Warning: Domain '{domain}' not found in question bank, using 'hr' as fallback")
        domain_questions = QUESTION_BANK.get("hr", {})
    
    # Get difficulty questions with fallback
    difficulty_questions = domain_questions.get(difficulty)
    if not difficulty_questions:
        print(f"Warning: Difficulty '{difficulty}' not found for domain '{domain}', trying beginner")
        difficulty_questions = domain_questions.get("beginner", [])
    
    if not difficulty_questions:
        # Ultimate fallback question
        print(f"Error: No questions found for domain '{domain}' difficulty '{difficulty}'")
        return {
            "question": "What is your approach to problem-solving?",
            "type": "behavioral",
            "options": [
                "A) Break down the problem, research solutions, implement and test",
                "B) Guess randomly until something works",
                "C) Ask someone else to solve it",
                "D) Ignore the problem"
            ],
            "correct_answer": "A) Break down the problem, research solutions, implement and test",
            "explanation": "Effective problem-solving involves understanding the problem, researching approaches, implementing a solution, and validating it works."
        }
    
    # Use session_id + domain + question_index as seed for unique randomization per question
    # This ensures each question in a session is different, not just shuffled once
    if session_id:
        # Include question_index in seed to get different questions each time
        seed_value = hash(f"{session_id}_{domain}_{difficulty}_{question_index}")
        random.seed(seed_value)
        
        # Shuffle questions uniquely for this specific question request
        shuffled = difficulty_questions.copy()
        random.shuffle(shuffled)
        
        # Select first question from this unique shuffle
        question = shuffled[0]
        
        # Reset seed to avoid affecting other random operations
        random.seed()
    else:
        # Fallback: cycle through questions if no session_id
        question = difficulty_questions[question_index % len(difficulty_questions)]
    
    return question

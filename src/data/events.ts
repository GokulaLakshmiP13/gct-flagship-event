export const coreEvents = [
  {
    pillar: "Build",
    title: "Hackathon",
    description: "Develop real-world solutions in teams within a limited time frame.",
    fee: 500,
    whatsappLink: "https://chat.whatsapp.com/sample_hackathon"
  },
  {
    pillar: "Think",
    title: "Coding & Quiz",
    description: "Test logical thinking, programming skills, and technical knowledge.",
    fee: 200,
    whatsappLink: "https://chat.whatsapp.com/sample_coding"
  },
  {
    pillar: "Present",
    title: "Paper & Pitch",
    description: "Showcase ideas, research, and innovations to judges and experts.",
    fee: 300,
    whatsappLink: "https://chat.whatsapp.com/sample_paper"
  },
  {
    pillar: "Learn",
    title: "Workshops",
    description: "Gain hands-on experience in emerging technologies and domains.",
    fee: 400,
    whatsappLink: "https://chat.whatsapp.com/sample_workshops"
  },
];

export const domainEvents = [
  {
    category: "CSE",
    events: [
      ["Coding Contest", "Solve algorithmic problems under time constraints."],
      ["Debugging Challenge", "Identify and fix errors in given programs."],
      ["Web Development", "Build a functional website for a given problem."],
    ],
  },
  {
    category: "ECE",
    events: [
      ["Circuit Debugging", "Analyze and correct faulty electronic circuits."],
      ["PCB Design", "Convert circuit diagrams into efficient PCB layouts."],
    ],
  },
  {
    category: "MECH",
    events: [["CAD Design", "Create accurate 2D/3D models using design tools."]],
  },
  {
    category: "EEE",
    events: [
      ["Power Simulation", "Analyze power systems using simulation tools."],
      ["Electrical Circuit Debugging", "Identify and resolve faults in electrical circuits."],
    ],
  },
  {
    category: "OPEN",
    events: [
      ["UI/UX Design", "Design intuitive and user-friendly interfaces."],
      ["Tech Quiz", "Test knowledge across multiple technical domains."],
      ["Project Expo", "Showcase working models and innovative projects."],
    ],
  },
];

export const eventOptions = [
  ...coreEvents.map(event => ({
    key: `core-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
    category: "Core",
    title: event.title,
    description: event.description,
    fee: event.fee,
    whatsappLink: event.whatsappLink
  })),
  ...domainEvents.flatMap((group) =>
    group.events.map(([title, description, whatsappLink]) => ({
      key: `${group.category.toLowerCase()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
      category: group.category,
      title,
      description,
      fee: 150, // Default fee for domain events
      whatsappLink: (whatsappLink as string) || "https://chat.whatsapp.com/sample_domain_event"
    })),
  )
];

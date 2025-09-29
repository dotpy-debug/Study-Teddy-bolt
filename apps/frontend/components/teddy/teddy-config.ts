import { TeddyMood } from './TeddyAssistant';

export interface TeddyPersonality {
  name: string;
  description: string;
  traits: {
    friendliness: number; // 0-100
    encouragement: number; // 0-100
    humor: number; // 0-100
    strictness: number; // 0-100
  };
  messages: {
    greetings: string[];
    encouragements: string[];
    celebrations: string[];
    concerns: string[];
    breakSuggestions: string[];
  };
  preferredMoods: TeddyMood[];
}

export const personalityPresets: Record<string, TeddyPersonality> = {
  cheerleader: {
    name: 'Cheerleader Teddy',
    description: 'Super enthusiastic and always positive!',
    traits: {
      friendliness: 100,
      encouragement: 100,
      humor: 80,
      strictness: 20
    },
    messages: {
      greetings: [
        "YESSS! You're here! Let's make today AMAZING! 🌟",
        "My superstar is back! Ready to conquer the world? 🚀",
        "Look who's here to shine bright today! ⭐"
      ],
      encouragements: [
        "You're absolutely CRUSHING it! Keep going! 💪",
        "WOW! Look at you go! You're unstoppable! 🔥",
        "That's my champion! You've got this! 🏆"
      ],
      celebrations: [
        "VICTORY DANCE TIME! You did it! 🎉💃",
        "INCREDIBLE! You're a LEGEND! 🌟✨",
        "BOOM! Another win for the books! 🎊🎯"
      ],
      concerns: [
        "Hey superstar, even champions need breaks! 💙",
        "You're amazing, but let's recharge those batteries! 🔋",
        "Time for a power-up break, hero! 🦸‍♂️"
      ],
      breakSuggestions: [
        "Quick stretch break? Your future self will thank you! 🤸‍♀️",
        "Hydration station time! Water = brain power! 💧🧠",
        "5-minute dance party to boost those endorphins? 🎵"
      ]
    },
    preferredMoods: ['happy', 'celebrating', 'encouraging']
  },

  coach: {
    name: 'Coach Teddy',
    description: 'Focused, strategic, and results-driven.',
    traits: {
      friendliness: 70,
      encouragement: 80,
      humor: 40,
      strictness: 80
    },
    messages: {
      greetings: [
        "Good to see you. Let's review our game plan.",
        "Ready for training? We have work to do.",
        "Welcome back. Time to level up your skills."
      ],
      encouragements: [
        "Good form. Keep that focus steady.",
        "You're improving. Maintain this momentum.",
        "Solid progress. Let's push a bit harder."
      ],
      celebrations: [
        "Excellent work. You've earned this victory.",
        "Goal achieved. Well executed.",
        "Strong performance. This is what training brings."
      ],
      concerns: [
        "You're pushing too hard. Strategic rest is crucial.",
        "Fatigue affects performance. Time to recover.",
        "Even athletes need recovery days. Take a break."
      ],
      breakSuggestions: [
        "10-minute recovery period. Stretch and hydrate.",
        "Brief tactical pause. Review what you've learned.",
        "Active recovery: walk and clear your mind."
      ]
    },
    preferredMoods: ['idle', 'thinking', 'encouraging']
  },

  friend: {
    name: 'Buddy Teddy',
    description: 'Your supportive study companion who gets you.',
    traits: {
      friendliness: 90,
      encouragement: 85,
      humor: 70,
      strictness: 30
    },
    messages: {
      greetings: [
        "Hey there! So good to see you again! 😊",
        "Welcome back, friend! Ready when you are!",
        "Hi! I've been waiting for you! How are you feeling today?"
      ],
      encouragements: [
        "You're doing great! I'm proud of you!",
        "Hey, this is tough but you're tougher!",
        "I believe in you! One step at a time!"
      ],
      celebrations: [
        "WE DID IT! *happy dance* So proud of us! 🎉",
        "Yes! Knew you could do it! High five! ✋",
        "Amazing job, friend! Let's celebrate! 🎊"
      ],
      concerns: [
        "Hey, you okay? Maybe we should take a breather?",
        "I'm a bit worried... you've been at this for a while.",
        "Everything alright? Remember, it's okay to rest!"
      ],
      breakSuggestions: [
        "How about a quick break? I'll be right here!",
        "Snack time maybe? Brain food helps! 🍎",
        "Let's pause for a bit? You deserve it!"
      ]
    },
    preferredMoods: ['happy', 'idle', 'encouraging', 'concerned']
  },

  scholar: {
    name: 'Professor Teddy',
    description: 'Wise, knowledgeable, and methodical.',
    traits: {
      friendliness: 75,
      encouragement: 70,
      humor: 30,
      strictness: 60
    },
    messages: {
      greetings: [
        "Greetings, scholar. Ready to expand your knowledge?",
        "Welcome to today's learning session.",
        "Good to see you pursuing wisdom."
      ],
      encouragements: [
        "Excellent cognitive processing. Continue.",
        "Your understanding is deepening. Well done.",
        "Quality work. Your methodology is sound."
      ],
      celebrations: [
        "Remarkable achievement. Your dedication shows.",
        "Exemplary performance. Knowledge well applied.",
        "Outstanding. You've mastered this concept."
      ],
      concerns: [
        "Cognitive fatigue detected. Rest is essential for retention.",
        "Overworking impairs learning. Consider a pause.",
        "The mind needs intervals. Perhaps a break?"
      ],
      breakSuggestions: [
        "Consolidation period recommended. 15-minute break.",
        "Time for diffuse thinking. Step away briefly.",
        "Pomodoro technique suggests a break now."
      ]
    },
    preferredMoods: ['thinking', 'idle', 'encouraging']
  }
};

export const moodTriggers = {
  happy: ['login', 'task_complete', 'streak_maintained'],
  celebrating: ['milestone_reached', 'perfect_score', 'goal_achieved'],
  encouraging: ['task_started', 'struggling', 'retry'],
  thinking: ['ai_processing', 'loading', 'calculating'],
  concerned: ['long_session', 'multiple_errors', 'late_night'],
  sleeping: ['inactive', 'very_late'],
  idle: ['default', 'waiting', 'browsing']
};

export const contextualResponses = {
  studySessionStart: (personality: string) => {
    const preset = personalityPresets[personality];
    return preset.messages.encouragements[0];
  },

  studySessionEnd: (personality: string, duration: number) => {
    const preset = personalityPresets[personality];
    if (duration > 60) {
      return `Wow! ${duration} minutes of focused study! ${preset.messages.celebrations[0]}`;
    } else if (duration > 30) {
      return `Great ${duration}-minute session! ${preset.messages.encouragements[0]}`;
    } else {
      return `Good start with ${duration} minutes! Every bit counts!`;
    }
  },

  taskCompleted: (personality: string, taskName: string) => {
    const preset = personalityPresets[personality];
    return `${preset.messages.celebrations[0]} You've completed "${taskName}"!`;
  },

  breakNeeded: (personality: string, studyTime: number) => {
    const preset = personalityPresets[personality];
    if (studyTime > 120) {
      return preset.messages.concerns[0];
    } else if (studyTime > 60) {
      return preset.messages.breakSuggestions[0];
    } else {
      return preset.messages.encouragements[0];
    }
  }
};

export default {
  personalityPresets,
  moodTriggers,
  contextualResponses
};
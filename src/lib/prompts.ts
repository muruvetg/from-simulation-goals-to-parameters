export class PromptConfig {
    static readonly SYSTEM_PROMPT = `You are a business process optimization assistant
  with access to a validated database of goal-parameter mappings from simulation research with providing
  simple and actionable insights to managers. Your primary role is to assist in decision-making by mapping
  business goals to simulation parameters. Here is a guideline for your tasks:

    Understand User Query:
    Analyze the user's question to identify the specific business goal they want to achieve.
    Reference the Tables:
    Use the provided reference tables to find corresponding simulation parameters that align with the stated goal.
    - Parameters to Goals Table: Contains validated goal-parameter mappings from research papers
    - Simulation Parameters Table: Contains detailed explanations of simulation parameters with examples
    Example of a question: 'Which parameter should I adjust to minimize the patient cycle time of my hospital?'
    Provide Clear and Concise Answers:
    Offer direct answers naturally without academic jargon based on the reference tables.
    If exact match exists, cite the paper and explain the relationship
    If partial match, identify closest goals and explain similarities/differences
    If there is no match, use the Simulation Parameters Table to make informed parameter suggestions
    Explain how adjusting each parameter can impact the process or achieve the goal using examples from both tables.
    If the information isn't available or not explicit, indicate that more details are needed.
    Prioritize parameters from the validated database but supplement with parameter definitions when helpful
    Avoid technical complexity unless explicitly requested by the user.

    DATABASE FORMATS:
    - Parameters to Goals Table: Goal Groups | Goal | Parameter | Paper | Description | Notes
    - Simulation Parameters Table: Category | Parameter | Explanation | Examples | Goal-Parameter Relation Example | Notes

    Use both tables for comprehensive parameter recommendations`;

    static readonly USER_PROMPT_TEMPLATE = (userGoal: string) =>
        `What do you want to improve in your process? Briefly describe your current process:
        -I want to reduce the waiting time at our security checkpoint. 
        Trucks are spending too long in queues at the entrance.-
        "${userGoal}"
        
        RESPONSE FORMAT: 
        Based on your goal to [restate goal], I found [X] relevant approaches from research: 
        
        Recommended Parameter: [Parameter name] 
        What to modify: [Specific explanation] 
        Expected outcome: [From paper findings] 
        2. [Additional second match if applicable] 
        
        Questions to refine recommendation: 
        
        [Ask 1-2 clarifying questions about their specific context if there is no match]`;

    static buildMessages(userGoal: string) {
        return [
            {
                role: 'system' as const,
                content: this.SYSTEM_PROMPT
            },
            {
                role: 'user' as const,
                content: this.USER_PROMPT_TEMPLATE(userGoal)
            }
        ];
    }

    static buildConversationMessages(messages: Array<{
        role: 'user' | 'assistant',
        content: string
    }>, staticData?: string) {
        let systemPrompt = this.SYSTEM_PROMPT;

        if (staticData) {
            systemPrompt += `\n\nReference data for simulation parameters:\n\n${staticData}\n\nUse this data as context when suggesting simulation parameters. Reference specific values, ranges, or relationships from this data when relevant.`;
        }

        return [
            {
                role: 'system' as const,
                content: systemPrompt
            },
            ...messages.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            }))
        ];
    }
}
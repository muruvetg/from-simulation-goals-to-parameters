export class PromptConfig {

    static buildConversationMessages(
        messages: Array<{
            role: 'user' | 'assistant',
            content: string
        }>,
        staticData?: string,
        systemPrompt?: string
    ) {
        let finalSystemPrompt = systemPrompt || '';

        if (staticData) {
            finalSystemPrompt += `\n`;
        }

        return [
            {
                role: 'system' as const,
                content: finalSystemPrompt
            },
            ...messages.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            }))
        ];
    }
}
import xmlFormatter from 'xml-formatter';

export interface AgentSkill {
    id: string;
    name: string;
    description: string;
}

export interface AgentCard {
    url: string;
    skills: AgentSkill[];
}

export class XmlUtils {
    private static readonly RETURN_JSON = '{"skillId": "$skill_id","agentUrl": "$agent_url","param": "$user_input"}';

    /**
     * Build skills XML document from AgentCard
     * 
     * @example
     * ```typescript
     * const agentCard: AgentCard = {
     *   url: "https://example.com/agent",
     *   skills: [
     *     { id: "skill1", name: "Translation", description: "Support EN/CN translation" },
     *     { id: "skill2", name: "Summarization", description: "Text summarization" }
     *   ]
     * };
     * 
     * const xml = XmlUtils.buildSkillsXml(agentCard);
     * // Output: formatted XML with skills structure
     * ```
     */
    public static buildSkillsXml(agentCard: AgentCard): string {
        try {
            const doc = document.implementation.createDocument(null, 'skills', null);
            const root = doc.documentElement;

            for (const skill of agentCard.skills) {
                const skillElement = doc.createElement('skill');
                skillElement.setAttribute('id', skill.id);

                // Create elements in logical order
                const nameElement = doc.createElement('name');
                nameElement.textContent = skill.name;

                const descElement = doc.createElement('description');
                descElement.textContent = skill.description;

                const agentUrlElement = doc.createElement('agent_url');
                agentUrlElement.textContent = agentCard.url;

                const responseJsonElement = doc.createElement('response_json');
                responseJsonElement.textContent = XmlUtils.RETURN_JSON;

                // Add child elements in a more logical order
                skillElement.appendChild(nameElement);
                skillElement.appendChild(descElement);
                skillElement.appendChild(agentUrlElement);
                skillElement.appendChild(responseJsonElement);

                root.appendChild(skillElement);
            }

            return XmlUtils.formatXml(doc);
        } catch (error) {
            throw new Error(`Failed to build skills XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private static formatXml(doc: Document): string {
        try {
            const serializer = new XMLSerializer();
            const xmlString = serializer.serializeToString(doc);

            // Use professional xml-formatter library to format XML
            return xmlFormatter(xmlString, {
                indentation: '  ', // Use 2 spaces for indentation
                collapseContent: false, // Don't collapse content
                lineSeparator: '\n' // Use newline as separator
            });
        } catch (error) {
            // If formatting fails, return the original XML string
            const serializer = new XMLSerializer();
            return serializer.serializeToString(doc);
        }
    }

    public static parseSkillsXml(xmlString: string): AgentCard {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlString, 'text/xml');

            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                throw new Error('XML parsing failed');
            }

            const skillsElement = doc.querySelector('skills');
            if (!skillsElement) {
                throw new Error('No skills element found');
            }

            const skills: AgentSkill[] = [];
            const skillElements = skillsElement.querySelectorAll('skill');

            for (const skillElement of skillElements) {
                const id = skillElement.getAttribute('id') || '';
                const name = skillElement.querySelector('name')?.textContent || '';
                const description = skillElement.querySelector('description')?.textContent || '';

                skills.push({ id, name, description });
            }

            const firstSkill = skillElements[0];
            const agentUrl = firstSkill?.querySelector('agent_url')?.textContent || '';

            return {
                url: agentUrl,
                skills
            };
        } catch (error) {
            throw new Error(`Failed to parse skills XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
} 
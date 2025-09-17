import { SettingA2AServer } from '@/types/a2a';
import { AgentCard } from '@a2a-js/sdk';
import xmlFormatter from 'xml-formatter';
import { formatTime } from './date';


export class XmlUtils {

    /**
     * Build A2A servers XML document from SettingA2AServer array
     */
    public static buildA2AServersXml(a2aServers: SettingA2AServer[]): string {
        try {
            const doc = document.implementation.createDocument(null, 'system_prompt', null);
            const root = doc.documentElement;
            root.setAttribute('role', 'assistant');
            root.setAttribute('version', 'v0.1.5');
            root.setAttribute("timestamp", formatTime(new Date()));

            const skillsElement = doc.createElement('skills');

            for (const server of a2aServers) {

                if (!server.enabled) {
                    continue;
                }

                const agentCard = JSON.parse(server.agentCardJson || '{}') as AgentCard;
                const agentCardSkills = agentCard.skills;
                for (const skill of agentCardSkills) {
                    const skillElement = doc.createElement('skill');

                    const idElement = doc.createElement('skill_id');
                    idElement.textContent = skill.id;

                    const nameElement = doc.createElement('skill_name');
                    nameElement.textContent = skill.name;

                    const descriptionElement = doc.createElement('description');
                    descriptionElement.textContent = skill.description;

                    const agentUrlElement = doc.createElement('agent_url');
                    agentUrlElement.textContent = agentCard.url;

                    const agentNameElement = doc.createElement('agent_name');
                    agentNameElement.textContent = agentCard.name;

                    skillElement.appendChild(idElement);
                    skillElement.appendChild(nameElement);
                    skillElement.appendChild(descriptionElement);
                    skillElement.appendChild(agentUrlElement);
                    skillElement.appendChild(agentNameElement);
                    skillsElement.appendChild(skillElement);
                }
            }
            root.appendChild(skillsElement);
            return XmlUtils.formatXml(doc);
        } catch (error) {
            throw new Error(`Failed to build A2A servers XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

} 
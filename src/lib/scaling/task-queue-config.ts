/**
 * Google Cloud Tasks Configuration for RankPilot
 * Implements message queue integration for horizontal scaling
 */

import { CloudTasksClient } from '@google-cloud/tasks';

interface TaskQueueConfig {
  projectId: string;
  location: string;
  queueName: string;
  maxConcurrentRequests: number;
  maxRetries: number;
}

export const taskQueueConfig: TaskQueueConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'rankpilot-h3jpc',
  location: process.env.GOOGLE_CLOUD_LOCATION || 'australia-southeast2',
  queueName: 'neuroseo-processing-queue',
  maxConcurrentRequests: 10,
  maxRetries: 3,
};

export class TaskQueueManager {
  private client: CloudTasksClient;
  private queuePath: string;

  constructor() {
    this.client = new CloudTasksClient();
    this.queuePath = this.client.queuePath(
      taskQueueConfig.projectId,
      taskQueueConfig.location,
      taskQueueConfig.queueName
    );
  }

  /**
   * Enqueue NeuroSEO analysis task for background processing
   */
  async enqueueAnalysisTask(payload: {
    urls: string[];
    targetKeywords: string[];
    userId: string;
    analysisType: 'comprehensive' | 'quick' | 'competitor';
  }) {
    const task = {
      httpRequest: {
        httpMethod: 'POST' as const,
        url: `${process.env.FUNCTIONS_URL}/api/neuroseo/process`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify(payload)),
      },
      scheduleTime: {
        seconds: Date.now() / 1000 + 10, // Schedule 10 seconds from now
      },
    };

    try {
      const [response] = await this.client.createTask({
        parent: this.queuePath,
        task,
      });
      
      console.log(`Task created: ${response.name}`);
      return response;
    } catch (_error) {
      console.error('Error creating task:', _error);
      throw _error;
    }
  }

  /**
   * Enqueue bulk keyword analysis for enterprise users
   */
  async enqueueBulkKeywordAnalysis(payload: {
    keywords: string[];
    userId: string;
    batchSize: number;
  }) {
    const batches = this.chunkArray(payload.keywords, payload.batchSize);
    const tasks = [];

    for (const [_index, batch] of batches.entries()) {
      const task = {
        httpRequest: {
          httpMethod: 'POST' as const,
          url: `${process.env.FUNCTIONS_URL}/api/keywords/batch-analyze`,
          headers: {
            'Content-Type': 'application/json',
          },
          body: Buffer.from(JSON.stringify({
            keywords: batch,
            userId: payload.userId,
            batchIndex: _index,
          })),
        },
        scheduleTime: {
          seconds: Date.now() / 1000 + (_index * 30), // Stagger by 30 seconds
        },
      };

      tasks.push(this.client.createTask({
        parent: this.queuePath,
        task,
      }));
    }

    try {
      const responses = await Promise.all(tasks);
      console.log(`Created ${responses.length} batch tasks`);
      return responses;
    } catch (_error) {
      console.error('Error creating batch tasks:', _error);
      throw _error;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export const taskQueue = new TaskQueueManager();

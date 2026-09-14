/**
 * ================================================================
 * MQTT Configuration Constants
 * ================================================================
 */

/** MQTT Broker configuration */
export const MQTT_CONFIG = {
  /** Default broker URL (HiveMQ public broker for testing) */
  BROKER_URL: 'wss://broker.hivemq.com:8884/mqtt',

  /** Alternative: Local Mosquitto broker */
  // BROKER_URL: 'ws://192.168.1.100:9001',

  /** Client ID prefix */
  CLIENT_ID_PREFIX: 'FactoryMonitor_',

  /** Quality of Service level */
  QOS: 1 as const,

  /** Keep alive interval (seconds) */
  KEEP_ALIVE: 60,

  /** Auto-reconnect */
  RECONNECT_PERIOD: 5000,

  /** Connection timeout (ms) */
  CONNECT_TIMEOUT: 10000,

  /** Clean session */
  CLEAN: true,
} as const;

/**
 * MQTT Topic Templates
 *
 * Convention:
 *   factory/node{id}/data      ← ESP32 publishes sensor DataPacket (JSON)
 *   factory/node{id}/time      ← ESP32 publishes TimePacket (JSON)
 *   factory/node{id}/command    → App publishes control commands
 *   factory/node{id}/config     → App publishes threshold/timer config
 *   factory/node{id}/timesync   → App publishes TimeSyncPacket
 */
export const MQTT_TOPICS = {
  /** Subscribe to sensor data from a node */
  nodeData: (nodeId: number) => `factory/node${nodeId}/data`,

  /** Subscribe to time reports from a node */
  nodeTime: (nodeId: number) => `factory/node${nodeId}/time`,

  /** Publish commands to a node */
  nodeCommand: (nodeId: number) => `factory/node${nodeId}/command`,

  /** Publish configuration to a node */
  nodeConfig: (nodeId: number) => `factory/node${nodeId}/config`,

  /** Publish time sync to a node */
  nodeTimeSync: (nodeId: number) => `factory/node${nodeId}/timesync`,

  /** Subscribe to all node data (wildcard) */
  allNodesData: 'factory/+/data',

  /** Subscribe to all node time (wildcard) */
  allNodesTime: 'factory/+/time',
} as const;

/** Maximum number of nodes supported (firmware supports nodeId 1-9) */
export const MAX_NODES = 9;

/** Node data timeout — consider offline after this duration (ms) */
export const NODE_OFFLINE_TIMEOUT = 15000;

/** Time sync interval (ms) — publish phone time every 60s for RTC-less nodes */
export const TIME_SYNC_INTERVAL = 60000;

/** Sensor data refresh interval for UI updates (ms) */
export const UI_REFRESH_INTERVAL = 1000;

import * as fs from 'fs';
import * as pg from 'pg';

import { ApiResponse } from './types';


const getConfig = (ssl: boolean = true): pg.ClientConfig => {
  const config: pg.ClientConfig = {
    host: 'rc1b-r21uoagjy1t7k77h.mdb.yandexcloud.net',
    port: 6432,
    database: 'db1',
    user: 'candidate',
    password: '62I8anq3cFq5GYh2u4Lh' // TODO: ??? I don't really care.
  }
  if (ssl) {
    config.ssl = {
      rejectUnauthorized: true,
      ca: fs.readFileSync(".root.crt").toString(),
    }
  };
  return config;
};



class Repo {
  client: pg.Client;

  constructor(client: pg.Client) { this.client = client }

  migrations = async () => {
    await this.client.query(`DROP TABLE nikuma;`);
    await this.client.query(
      `
      CREATE TABLE nikuma (
        id SERIAL PRIMARY KEY,
        name TEXT,
        data JSONB
      );
      `
    );
  }

  createInstances = async (instances: [string[], object[]]) => {
    await this.client.query(
      `INSERT INTO nikuma (name, data) SELECT * FROM UNNEST ($1::text[], $2::jsonb[])`,
      instances,
    );
  }
}


class ApiClient {
  baseUrl: string;

  constructor(baseUrl: string = 'https://rickandmortyapi.com/api') {
    this.baseUrl = baseUrl;
  }

  getInstances = async (page: number = 1) => {
    const res = await fetch(this.baseUrl + '/character?' + new URLSearchParams({page: page.toString(), count: Number(200).toString()}).toString());
    return await res.json() as ApiResponse;
  }
}

class Service {
  apiClient: ApiClient;
  repo: Repo;

  constructor(apiClient: ApiClient, repo: Repo) {
    this.apiClient = apiClient;
    this.repo = repo;
  }

  sync = async () => {
    let data: [string[], any[]] = [[], []];
    console.log('  Fetching...');
    let res = await this.apiClient.getInstances();
    const pages = res.info.pages;
    for(let i: number = 1; i <= pages; i++){
      this.apiClient.getInstances(i).then((res) => {
        if (!res.results) { return }
        res.results.forEach((instance) => {
          data[0].push(instance.name);
          data[1].push(instance);
        })
      })
    }
    console.log('  Inserting...')
    await this.repo.createInstances(data);
  }
}


const main = async () => {
  const conn = new pg.Client(getConfig(fs.existsSync('.root.crt')));
  const repo = new Repo(conn);
  const apiClient = new ApiClient();
  const service = new Service(apiClient, repo);

  await conn.connect();
  try {
    console.log('Making migrations...');
    await repo.migrations();
    console.log('Syncing data...')
    console.time('Syncing time')
    await service.sync();
    console.timeEnd('Syncing time')
    console.log('Done!')
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
})

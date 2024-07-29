export interface ApiResponse {
  info: {
    count: number,
    pages: number,
    next: string,
    prev: string
  },
  results: {
    id: number,
    name: string,
    status: string,
    species: string,
    type: string,
    gender: string,
    origin: {
      name: string,
      url: string,
    },
    location: {
      name: string,
      url: string,
    },
    image: string,
    episodes: string[],
    url: string,
    created: string,
  }[]
}

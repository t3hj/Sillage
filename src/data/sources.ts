/** Credit for third-party datasets. Required by the CC BY 4.0 licence on Scento's data. */
export interface DataSource {
  name: string;
  url: string;
  license: string;
  licenseUrl: string;
}

export const DATA_SOURCES: Record<string, DataSource> = {
  Scento: {
    name: "Scento Perfume Database",
    url: "https://www.scento.com/perfume-database",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
};

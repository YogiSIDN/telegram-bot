const fs = require("fs");
const fetch = require("node-fetch");

class AniListAPI {
    constructor() {
        this.RegEx = {
            "url": "/<\/?[^>_]+(>|$)/g"
        };

        this.seasonMap = {
            "WINTER": "Winter",
            "SPRING": "Spring",
            "SUMMER": "Summer",
            "FALL": "Fall"
        };

        this.statusMap = {
            "FINISHED": "Finished",
            "RELEASING": "Releasing",
            "NOT_YET_RELEASED": "Not Yet Released",
            "CANCELLED": "Cancelled",
            "HIATUS": "Hiatus"
        };

        this.sourceMap = {
            "ORIGINAL": "Original",
            "ANIME": "Anime",
            "MANGA": "Manga",
            "COMIC": "Comic",
            "NOVEL": "Novel",
            "WEB_NOVEL": "Web Novel",
            "LIGHT_NOVEL": "Light Novel",
            "VISUAL_NOVEL": "Visual Novel",
            "GAME": "Game",
            "VIDEO_GAME": "Video Game",
            "LIVE_ACTION": "Live Action",
            "PICTURE_BOOK": "Picture Book",
            "MULTIMEDIA_PROJECT": "Multimedia Project",
            "DOUJINSHI": "Doujinshi",
            "OTHER": "Other"
        };
    }

    formatDate(date) {
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const day = date.day ? date.day : "";
        const month = date.month ? months[date.month - 1] : "";
        const year = date.year ? date.year : "";

        if (!day && !month && !year) {
            return "Date Not Available";
        }

        let formattedDate = "";
        if (month) formattedDate += month;
        if (day) formattedDate += (formattedDate ? ` ${day}` : day);
        if (year) formattedDate += (formattedDate ? `, ${year}` : year);

        return formattedDate.trim();
    }

    async chartAnimeBySeason(season, year) {
        const query = `
            query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
                        id
                        title {
                            romaji
                            english
                        }
                        status
                        episodes
                        averageScore
                        coverImage {
                            large
                        }
                        nextAiringEpisode {
                            airingAt
                            episode
                        }
                    }
                }
            }
        `;

        const variables = {
            season: season.toUpperCase(),
            year: year,
            page: 1,
            perPage: 10,
        };

        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ query, variables }),
        });

        const data = await response.json();
        const aniChart = data.data.Page.media;

        aniChart.forEach(anime => {
            anime.status = this.statusMap[anime.status] || anime.status;
        });

        return aniChart;
    }

    async fetchCurrentlyAiringAnimeBySeason(season, seasonYear) {
        const query = `
            {
                Page(perPage: 20, page: 1) {
                    media(type: ANIME, status: RELEASING, season: ${season.toUpperCase()}, seasonYear: ${seasonYear}, sort: [POPULARITY_DESC]) {
                        id
                        title {
                            romaji
                            english
                            native
                        }
                        status
                        episodes
                        averageScore
                        coverImage {
                            large
                        }
                        nextAiringEpisode {
                            airingAt
                            episode
                        }
                    }
                }
            }
        `;

        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({ query }),
        });

        const data = await response.json();
        const airing = data.data.Page.media;

        airing.forEach(anime => {
            anime.status = this.statusMap[anime.status] || anime.status;
        });

        return airing;
    }

    async getTrendingManga() {
        const query = `
            query {
                Page(page: 1, perPage: 10) {
                    media(sort: TRENDING_DESC, type: MANGA) {
                        id
                        title {
                            romaji
                            english
                        }
                        genres
                        format
                        coverImage {
                            large
                        }
                    }
                }
            }
        `;

        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ query }),
        });

        const data = await response.json();
        return data.data.Page.media;
    }

    async getTrendingAnime() {
        const query = `
            query {
                Page(page: 1, perPage: 5) {
                    media(sort: TRENDING_DESC, type: ANIME) {
                        id
                        title {
                            romaji
                            english
                        }
                        genres
                        format
                        coverImage {
                            large
                        }
                    }
                }
            }
        `;

        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ query }),
        });

        const data = await response.json();
        return data.data.Page.media;
    }

    async searchAnimeByName(animeName) {
        const query = `
            query ($name: String) {
                Page(page: 1, perPage: 10) {
                    media(search: $name, type: ANIME) {
                        id
                        title {
                            romaji
                            english
                        }
                        description
                        bannerImage
                        coverImage {
                            large
                        }
                        genres
                        format
                    }
                }
            }
        `;

        const variables = {
            name: animeName,
        };

        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ query, variables }),
        });

        const data = await response.json();
        const animeList = data.data.Page.media;

        animeList.forEach(anime => {
            if (anime.description) {
                anime.bannerImage = `https://img.anili.st/media/${anime.id}`;
                anime.description = anime.description.replace(/<\/?[^>]+(>|$)/g, "");
            }
        });

        return animeList;
    }

    async searchAnimeById(animeId) {
        const query = `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    id
                    title {
                        romaji
                        english
                    }
                    description
                    coverImage {
                        large
                    }
                    genres
                    format
                    episodes
                    duration
                    status
                    source
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    season
                    seasonYear
                    averageScore
                    characters {
                        nodes {
                            id
                            name {
                                full
                                native
                            }
                            image {
                                large
                            }
                        }
                    }
                }
            }
        `;

        const variables = {
            id: animeId,
        };

        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ query, variables }),
        });

        const data = await response.json();
        const anime = data.data.Media;

        anime.status = this.statusMap[anime.status] || anime.status;
        anime.season = this.seasonMap[anime.season] || anime.season;
        anime.source = this.sourceMap[anime.source] || anime.source;
        anime.description = anime.description.replace(/<\/?[^>]+(>|$)/g, "");
        anime.startDate = this.formatDate(anime.startDate);
        anime.endDate = this.formatDate(anime.endDate);

        return anime;
    }

    async searchMangaByName(mangaName) {
        const query = `
            query ($name: String) {
                Page(page: 1, perPage: 10) {
                    media(search: $name, type: MANGA) {
                        id
                        title {
                            romaji
                            english
                        }
                        description
                        coverImage {
                            large
                        }
                        genres
                        format
                    }
                }
            }
        `;

        const variables = {
            name: mangaName,
        };

        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ query, variables }),
        });

        const data = await response.json();
        const mangaList = data.data.Page.media;

        mangaList.forEach(manga => {
            if (manga.description) {
                manga.description = manga.description.replace(/<\/?[^>]+(>|$)/g, "");
            }
        });

        return mangaList;
    }

    async searchMangaById(mangaId) {
        const query = `
            query ($id: Int) {
                Media(id: $id, type: MANGA) {
                    id
                    title {
                        romaji
                        english
                    }
                    description
                    coverImage {
                        large
                    }
                    genres
                    format
                    status
                    source
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    averageScore
                    chapters
                    volumes
                }
            }
        `;

        const variables = {
            id: mangaId,
        };

        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ query, variables }),
        });

        const data = await response.json();
        const manga = data.data.Media;

        manga.status = this.statusMap[manga.status] || manga.status;
        manga.source = this.sourceMap[manga.source] || manga.source;
        manga.description = manga.description.replace(/<\/?[^>]+(>|$)/g, "");
        manga.startDate = this.formatDate(manga.startDate);
        manga.endDate = this.formatDate(manga.endDate);

        return manga;
    }

    async searchCharacterByName(characterName) {
        const query = `
            query ($name: String) {
                Page(page: 1, perPage: 10) {
                    characters(search: $name, sort: [ROLE_DESC]) {
                        id
                        name {
                            full
                            native
                        }
                        image {
                            large
                        }
                        media {
                            nodes {
                                title {
                                    romaji
                                    english
                                    native
                                }
                                type
                                characters {
                                    edges {
                                        role
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const variables = {
            name: characterName,
        };

        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ query, variables }),
        });

        const data = await response.json();
        const characterList = data.data.Page.characters;

        const modifiedCharacterList = characterList.map((character) => {
            const firstMedia = character.media.nodes[0];
            const firstRole = firstMedia.characters.edges[0]?.role;

            return {
                id: character.id,
                name: character.name,
                image: character.image,
                firstMedia: {
                    title: firstMedia.title.romaji,
                    type: firstMedia.type,
                    role: firstRole,
                }
            };
        });

        return modifiedCharacterList;
    }

    async searchCharacterById(characterId) {
        const query = `
            query ($id: Int) {
                Character(id: $id) {
                    id
                    name {
                        full
                        native
                    }
                    image {
                        large
                    }
                    description
                    media {
                        nodes {
                            title {
                                romaji
                                english
                            }
                            type
                            genres
                            id
                        }
                    }
                    gender
                }
            }
        `;

        const variables = {
            id: characterId,
        };

        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ query, variables }),
        });

        const data = await response.json();
        const character = data.data.Character;

        character.description = character.description.replace(/<\/?[^>]_+(>|$)/g, "") || character.description;
        character.description = character.description.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1") || character.description;

        return character;
    }
}

module.exports = AniListAPI;
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PRISM Backend"
    app_env: str = "development"
    database_url: str = "sqlite:///./prism.db"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    github_token: str | None = None
    huggingface_token: str | None = None
    semantic_scholar_api_key: str | None = None
    news_rss_feeds: str = "https://www.technologyreview.com/feed/,https://venturebeat.com/category/ai/feed/"
    engineering_blog_rss_feeds: str = (
        "https://netflixtechblog.com/feed,"
        "https://engineering.fb.com/feed/,"
        "https://aws.amazon.com/blogs/machine-learning/feed/"
    )
    papers_with_code_api_url: str = "https://paperswithcode.com/api/v1/papers/"
    crossref_mailto: str | None = None
    enable_llm: bool = False
    groq_api_key: str | None = None
    llm_api_key: str | None = None
    llm_model: str = "llama-3.1-8b-instant"
    llm_base_url: str = "https://api.groq.com/openai/v1"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    enable_openclaw: bool = False
    openclaw_url: str = "http://localhost:9000"
    openclaw_timeout_seconds: float = 10.0
    openclaw_credentials_path: str = "creds.enc"
    openclaw_credentials_key_path: str = "creds.key"
    enable_scheduler: bool = False
    chroma_persist_path: str = "./chroma_db"
    embedding_model: str = "all-MiniLM-L6-v2"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str | None = None
    enable_neo4j: bool = False
    enable_persona: bool = True
    prism_heartbeat_hours: int = 6
    prism_agent_query: str = "multimodal agents"
    prism_agent_limit_per_source: int = 5
    prism_agent_include_demo: bool = True
    prism_soul_profile_path: str = "app/agent/soul_profile.yaml"
    discord_webhook_url: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def rss_feed_list(self) -> List[str]:
        return [feed.strip() for feed in self.news_rss_feeds.split(",") if feed.strip()]

    @property
    def engineering_blog_feed_list(self) -> List[str]:
        return [feed.strip() for feed in self.engineering_blog_rss_feeds.split(",") if feed.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

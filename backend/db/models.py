from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, relationship
from pgvector.sqlalchemy import Vector


class Base(DeclarativeBase):
    pass


class RedaktionsLog(Base):
    __tablename__ = "redaktions_log"
    __table_args__ = {"schema": "clnpth"}

    id = Column(Integer, primary_key=True)
    titel = Column(String(500), nullable=False)
    trigger_typ = Column(String(50), nullable=False)  # prompt, url, rss, calendar, image
    status = Column(String(50), nullable=False, default="generating")
    kategorie = Column(String(100))
    sprachen = Column(JSONB, default={"de": True, "en": True, "es": True, "fr": True})
    kontext_quellen = Column(JSONB)
    erstellt_am = Column(DateTime, default=datetime.utcnow)
    aktualisiert_am = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    archiv_eintrag = relationship("ArtikelArchiv", back_populates="redaktions_log", uselist=False)
    supervisor_logs = relationship("SupervisorLog", back_populates="artikel")
    uebersetzungen = relationship("ArtikelUebersetzung", back_populates="artikel")


class ArtikelArchiv(Base):
    __tablename__ = "artikel_archiv"
    __table_args__ = {"schema": "clnpth"}

    id = Column(Integer, primary_key=True)
    redaktions_log_id = Column(Integer, ForeignKey("clnpth.redaktions_log.id"), unique=True)
    titel = Column(String(500), nullable=False)
    lead = Column(Text)
    body = Column(Text)
    quellen = Column(JSONB)
    seo_titel = Column(String(60))
    seo_description = Column(String(160))
    bild_url = Column(Text)
    bild_prompt = Column(Text)
    bild_alt_texte = Column(JSONB)  # {de: "...", en: "...", ...}
    embedding = Column(Vector(1024))  # mistral-embed dimension
    wp_post_id = Column(Integer)
    erstellt_am = Column(DateTime, default=datetime.utcnow)

    redaktions_log = relationship("RedaktionsLog", back_populates="archiv_eintrag")


class ArtikelUebersetzung(Base):
    __tablename__ = "artikel_uebersetzungen"
    __table_args__ = {"schema": "clnpth"}

    id = Column(Integer, primary_key=True)
    artikel_id = Column(Integer, ForeignKey("clnpth.redaktions_log.id"))
    sprache = Column(String(5), nullable=False)  # en, es, fr
    titel = Column(String(500))
    lead = Column(Text)
    body = Column(Text)
    status = Column(String(50), default="pending")  # pending, deepl_done, reviewed, approved
    wp_post_id = Column(Integer)
    erstellt_am = Column(DateTime, default=datetime.utcnow)

    artikel = relationship("RedaktionsLog", back_populates="uebersetzungen")


class SupervisorLog(Base):
    __tablename__ = "supervisor_log"
    __table_args__ = {"schema": "clnpth"}

    id = Column(Integer, primary_key=True)
    artikel_id = Column(Integer, ForeignKey("clnpth.redaktions_log.id"))
    supervisor_empfehlung = Column(String(50))  # freigeben, ueberarbeiten, ablehnen
    supervisor_begruendung = Column(Text)
    supervisor_score = Column(Integer)
    tonality_tags = Column(JSONB)
    redakteur_entscheidung = Column(String(50))
    redakteur_feedback = Column(Text)
    abweichung = Column(Boolean, default=False)
    erstellt_am = Column(DateTime, default=datetime.utcnow)

    artikel = relationship("RedaktionsLog", back_populates="supervisor_logs")


class TonalityProfil(Base):
    __tablename__ = "tonality_profil"
    __table_args__ = {"schema": "clnpth"}

    id = Column(Integer, primary_key=True)
    merkmal = Column(Text, nullable=False)
    wert = Column(Text)
    gewichtung = Column(Float, default=0.5)
    belege = Column(Integer, default=0)
    aktualisiert = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ThemenRanking(Base):
    __tablename__ = "themen_ranking"
    __table_args__ = {"schema": "clnpth"}

    id = Column(Integer, primary_key=True)
    thema = Column(Text, nullable=False)
    kategorie = Column(String(100))
    artikel_count = Column(Integer, default=0)
    freigabe_rate = Column(Float)
    letzter_artikel = Column(DateTime)

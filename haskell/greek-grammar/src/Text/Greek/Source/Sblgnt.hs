{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE OverloadedStrings #-}

module Text.Greek.Source.Sblgnt where

import Prelude hiding ((*), (+), getLine)
import Control.Lens hiding (element)
import Data.Text (Text)
import Text.Greek.Utility
import Text.Greek.Xml
import Text.Parsec.Combinator
import Text.Parsec.Error (ParseError)
import Text.Parsec.Pos (SourcePos)
import Text.Parsec.Prim
import qualified Data.XML.Types as X
import qualified Text.Parsec.Pos as P

type Event = FileReference * BasicEvent XmlLocalName X.Content XmlAttributes

type EventParser = ParsecT [Event] () Identity
type AttributeParser = ParsecT XmlAttributes () Identity

readSblgntEvents :: FilePath -> IO ([SblgntError] + [Event])
readSblgntEvents p = fmap (sblgntTransform p) . readEvents $ p

sblgntTransform
  :: FilePath
  -> [XmlInternalError] + [FileReference * X.Event]
  -> [SblgntError] + [Event]
sblgntTransform p x
  =   liftErrors SblgntErrorXmlInternal x
  >>. dropComments
  >>. trimContent _2
  >>= liftErrors SblgntErrorXml . toBasicEvents
  >>= tryOverAll (_2 . _BasicEventBeginElement . _1) tryDropNamespace (errorContext SblgntErrorUnexpectedNamespace _1)
  >>= tryOverAll (_2 . _BasicEventEndElement) tryDropNamespace (errorContext SblgntErrorUnexpectedNamespace _1)
  >>= over _Left (pure . SblgntErrorEventParse) . parseEvents p

data SblgntError
  = SblgntErrorXmlInternal XmlInternalError
  | SblgntErrorXml (XmlError FileReference)
  | SblgntErrorUnexpectedNamespace FileReference X.Name
  | SblgntErrorEventParse ParseError
  deriving (Show)

parseEvent :: Stream s m Event => (Event -> Maybe a) -> ParsecT s u m a
parseEvent = tokenPrim show updateSourcePos

satisfy :: Stream s m Event => (Event -> Bool) -> ParsecT s u m Event
satisfy p = tokenPrim show updateSourcePos testEvent
  where testEvent x = if p x then Just x else Nothing

updateSourcePos :: SourcePos -> (FileReference, t) -> s -> SourcePos
updateSourcePos p (r, _) _ = flip P.setSourceColumn column . flip P.setSourceLine line $ p
  where
    beginPos = fileReferenceBegin r
    line = getLine . lineReferenceLine $ beginPos
    column = getColumn . lineReferenceColumn $ beginPos

begin :: Stream s m Event => XmlLocalName -> ParsecT s u m Event
begin n = satisfy isBegin
  where
    isBegin :: Event -> Bool
    isBegin (_, (BasicEventBeginElement n' _)) | n == n' = True
    isBegin _ = False

end :: Stream s m Event => XmlLocalName -> ParsecT s u m Event
end n = satisfy isEnd
  where
    isEnd :: Event -> Bool
    isEnd (_, (BasicEventEndElement n')) | n == n' = True
    isEnd _ = False

elementOpen :: Stream s m Event => Text -> ParsecT s u m [Event]
elementOpen n = begin name *> manyTill anyEvent (try (end name))
  where name = XmlLocalName n

elementSimple :: Text -> EventParser a -> (a -> b) -> EventParser b
elementSimple n p f = f <$> go
  where
    go = begin name *> p <* end name
    name = XmlLocalName n

contentParser :: EventParser Text
contentParser = parseEvent getContent
  where
    getContent :: Event -> Maybe Text
    getContent (_, BasicEventContent (X.ContentText t)) = Just t
    getContent _ = Nothing

newtype Paragraph = Paragraph Text deriving Show

paragraphParser :: EventParser Paragraph
paragraphParser = elementSimple "p" contentParser Paragraph

newtype Title = Title [Paragraph] deriving Show

titleParser :: EventParser Title
titleParser = elementSimple "title" (many paragraphParser) Title

data Link = Link { linkHref :: Text, linkContent :: Text } deriving Show

newtype Content = Content Text deriving Show
data ParagraphLink
  = ParagraphLinkContent Content
  | ParagraphLinkLink Link
  deriving Show
newtype License = License [ParagraphLink] deriving Show

linkParser :: EventParser Link
linkParser = elementSimple "a" contentParser (Link "")

paragraphLinkParser :: EventParser ParagraphLink
paragraphLinkParser = elementSimple "p" (content <|> link) id
  where
    content = fmap (ParagraphLinkContent . Content) contentParser
    link = fmap ParagraphLinkLink linkParser

anyEvent :: Stream s m Event => ParsecT s u m Event
anyEvent = satisfy (const True)

parseEvents :: FilePath -> [Event] -> ParseError + [Event]
parseEvents p = parse (elementOpen "sblgnt") p

{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE TemplateHaskell #-}

module Text.Greek.Grammar where

import Control.Lens (makeLenses)
import Data.Text (Text)

data Source = Source
  { _author :: Text
  , _title :: Text
  , _year :: Int
  }
makeLenses ''Source

data Part =
    Section Text
  | Page Int

data Citation = Citation Source Part

mounceSource :: Source
mounceSource = Source "William D. Mounce" "The Morphology of Biblical Greek" 1994

mounceCitation :: Text -> Citation
mounceCitation = Citation mounceSource . Section

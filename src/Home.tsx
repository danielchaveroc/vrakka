import {useEffect, useState} from "react";
import styled from "styled-components";
import confetti from "canvas-confetti";
import * as anchor from "@project-serum/anchor";
import {LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import {useAnchorWallet} from "@solana/wallet-adapter-react";
import {WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import {GatewayProvider} from '@civic/solana-gateway-react';
import Countdown from "react-countdown";
import {Snackbar, Paper, LinearProgress, Chip} from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import {toDate, AlertState, getAtaForMint} from './utils';
import {MintButton} from './MintButton';
import {
    CandyMachine,
    awaitTransactionSignatureConfirmation,
    getCandyMachineState,
    mintOneToken,
    CANDY_MACHINE_PROGRAM,
} from "./candy-machine";

const cluster = process.env.REACT_APP_SOLANA_NETWORK!.toString();
const decimals = process.env.REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS ? +process.env.REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS!.toString() : 9;
const splTokenName = process.env.REACT_APP_SPL_TOKEN_TO_MINT_NAME ? process.env.REACT_APP_SPL_TOKEN_TO_MINT_NAME.toString() : "TOKEN";

const WalletContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
`;

const WalletAmount = styled.div`
  color: black;
  width: auto;
  padding: 5px 5px 5px 16px;
  min-width: 48px;
  min-height: auto;
  border-radius: 22px;
  background-color: var(--main-text-color);
  box-shadow: 0px 3px 5px -1px rgb(0 0 0 / 20%), 0px 6px 10px 0px rgb(0 0 0 / 14%), 0px 1px 18px 0px rgb(0 0 0 / 12%);
  box-sizing: border-box;
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, border 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  font-weight: 500;
  line-height: 1.75;
  text-transform: uppercase;
  border: 0;
  margin: 0;
  display: inline-flex;
  outline: 0;
  position: relative;
  align-items: center;
  user-select: none;
  vertical-align: middle;
  justify-content: flex-start;
  gap: 10px;
`;

const Wallet = styled.ul`
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
`;

const ConnectButton = styled(WalletMultiButton)`
  border-radius: 18px !important;
  padding: 6px 16px;
  background-color: #4E44CE;
  margin: 0 auto;
`;

const NFT = styled(Paper)`
  min-width: 500px;
  padding: 5px 20px 20px 20px;
  flex: 1 1 auto;
  background-color: var(--card-background-color) !important;
  box-shadow: 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22) !important;
`;
// eslint-disable-next-line
const Des = styled(NFT)`
  text-align: left;
  padding-top: 0px;
`;


const Card = styled(Paper)`
  display: inline-block;
  background-color: var(card-background-lighter-color) !important;
  margin: 5px;
  min-width: 40px;
  padding: 24px;
  h1{
    margin:0px;
  }
`;

const MintButtonContainer = styled.div`
  button.MuiButton-contained:not(.MuiButton-containedPrimary).Mui-disabled {
    color: #464646;
  }

  button.MuiButton-contained:not(.MuiButton-containedPrimary):hover,
  button.MuiButton-contained:not(.MuiButton-containedPrimary):focus {
    -webkit-animation: pulse 1s;
    animation: pulse 1s;
    box-shadow: 0 0 0 2em rgba(255, 255, 255, 0);
  }

  @-webkit-keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 #ef8f6e;
    }
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 #ef8f6e;
    }
  }
`;

const Logo = styled.div`
  flex: 0 0 auto;

  img {
    height: 60px;
  }
`;
const Menu = styled.ul`
  list-style: none;
  display: inline-flex;
  flex: 1 0 auto;

  li {
    margin: 0 12px;

    a {
      color: var(--main-text-color);
      list-style-image: none;
      list-style-position: outside;
      list-style-type: none;
      outline: none;
      text-decoration: none;
      text-size-adjust: 100%;
      touch-action: manipulation;
      transition: color 0.3s;
      padding-bottom: 15px;

      img {
        max-height: 26px;
      }
    }

    a:hover, a:active {
      color: rgb(131, 146, 161);
      border-bottom: 4px solid var(--title-text-color);
    }

  }
`;

const SolExplorerLink = styled.a`
  color: var(--title-text-color);
  border-bottom: 1px solid var(--title-text-color);
  font-weight: bold;
  list-style-image: none;
  list-style-position: outside;
  list-style-type: none;
  outline: none;
  text-decoration: none;
  text-size-adjust: 100%;

  :hover {
    border-bottom: 2px solid var(--title-text-color);
  }
`;

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 0px;
  margin-bottom: 0px;
  margin-right: 0%;
  margin-left: 0%;
  text-align: center;
  justify-content: center;
`;

const MintContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 20px;
`;

const DesContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 20px;
`;

const Price = styled(Chip)`
  position: absolute;
  margin: 5px;
  font-weight: bold;
  font-size: 1.2em !important;
  font-family: 'Patrick Hand', cursive !important;
`;

const Image = styled.img`
  height: 400px;
  width: auto;
  border-radius: 7px;
  box-shadow: 5px 5px 40px 5px rgba(0,0,0,0.5);
`;

const BorderLinearProgress = styled(LinearProgress)`
  margin: 20px;
  height: 10px !important;
  border-radius: 30px;
  border: 2px solid white;
  box-shadow: 5px 5px 40px 5px rgba(0,0,0,0.5);
  background-color:var(--main-text-color) !important;
  
  > div.MuiLinearProgress-barColorPrimary{
    background-color:var(--title-text-color) !important;
  }

  > div.MuiLinearProgress-bar1Determinate {
    border-radius: 30px !important;
    background-image: linear-gradient(270deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0.5));
  }
`;

const ShimmerTitle = styled.h1`
  margin: 20px auto;
  text-transform: uppercase;
  animation: glow 2s ease-in-out infinite alternate;
  color: var(--main-text-color);
  @keyframes glow {
    from {
      text-shadow: 0 0 20px var(--main-text-color);
    }
    to {
      text-shadow: 0 0 30px var(--title-text-color), 0 0 10px var(--title-text-color);
    }
  }
`;

const GoldTitle = styled.h2`
  color: var(--title-text-color);
`;

const LogoAligner = styled.div`
  display: flex;
  align-items: center;

  img {
    max-height: 35px;
    margin-right: 10px;
  }
`;


export interface HomeProps {
    candyMachineId: anchor.web3.PublicKey;
    connection: anchor.web3.Connection;
    txTimeout: number;
    rpcHost: string;
}

const Home = (props: HomeProps) => {
    const [balance, setBalance] = useState<number>();
    const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
    const [isActive, setIsActive] = useState(false); // true when countdown completes or whitelisted
    const [solanaExplorerLink, setSolanaExplorerLink] = useState<string>("");
    const [itemsAvailable, setItemsAvailable] = useState(0);
    const [itemsRedeemed, setItemsRedeemed] = useState(0);
    const [itemsRemaining, setItemsRemaining] = useState(0);
    const [isSoldOut, setIsSoldOut] = useState(false);
    const [payWithSplToken, setPayWithSplToken] = useState(false);
    const [price, setPrice] = useState(0);
    const [priceLabel, setPriceLabel] = useState<string>("SOL");
    const [whitelistPrice, setWhitelistPrice] = useState(0);
    const [whitelistEnabled, setWhitelistEnabled] = useState(false);
    const [isBurnToken, setIsBurnToken] = useState(false);
    const [whitelistTokenBalance, setWhitelistTokenBalance] = useState(0);
    const [isEnded, setIsEnded] = useState(false);
    const [endDate, setEndDate] = useState<Date>();
    const [isPresale, setIsPresale] = useState(false);
    const [isWLOnly, setIsWLOnly] = useState(false);

    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: "",
        severity: undefined,
    });

    const wallet = useAnchorWallet();
    const [candyMachine, setCandyMachine] = useState<CandyMachine>();

    const rpcUrl = props.rpcHost;

    const refreshCandyMachineState = () => {
        (async () => {
            if (!wallet) return;

            const cndy = await getCandyMachineState(
                wallet as anchor.Wallet,
                props.candyMachineId,
                props.connection
            );

            setCandyMachine(cndy);
            setItemsAvailable(cndy.state.itemsAvailable);
            setItemsRemaining(cndy.state.itemsRemaining);
            setItemsRedeemed(cndy.state.itemsRedeemed);

            var divider = 1;
            if (decimals) {
                divider = +('1' + new Array(decimals).join('0').slice() + '0');
            }

            // detect if using spl-token to mint
            if (cndy.state.tokenMint) {
                setPayWithSplToken(true);
                // Customize your SPL-TOKEN Label HERE
                // TODO: get spl-token metadata name
                setPriceLabel(splTokenName);
                setPrice(cndy.state.price.toNumber() / divider);
                setWhitelistPrice(cndy.state.price.toNumber() / divider);
            }else {
                setPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
                setWhitelistPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
            }


            // fetch whitelist token balance
            if (cndy.state.whitelistMintSettings) {
                setWhitelistEnabled(true);
                setIsBurnToken(cndy.state.whitelistMintSettings.mode.burnEveryTime);
                setIsPresale(cndy.state.whitelistMintSettings.presale);
                setIsWLOnly(!isPresale && cndy.state.whitelistMintSettings.discountPrice === null);

                if (cndy.state.whitelistMintSettings.discountPrice !== null && cndy.state.whitelistMintSettings.discountPrice !== cndy.state.price) {
                    if (cndy.state.tokenMint) {
                        setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice?.toNumber() / divider);
                    } else {
                        setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice?.toNumber() / LAMPORTS_PER_SOL);
                    }
                }

                let balance = 0;
                try {
                    const tokenBalance =
                        await props.connection.getTokenAccountBalance(
                            (
                                await getAtaForMint(
                                    cndy.state.whitelistMintSettings.mint,
                                    wallet.publicKey,
                                )
                            )[0],
                        );

                    balance = tokenBalance?.value?.uiAmount || 0;
                } catch (e) {
                    console.error(e);
                    balance = 0;
                }
                setWhitelistTokenBalance(balance);
                setIsActive(isPresale && !isEnded && balance > 0);
            } else {
                setWhitelistEnabled(false);
            }

            // end the mint when date is reached
            if (cndy?.state.endSettings?.endSettingType.date) {
                setEndDate(toDate(cndy.state.endSettings.number));
                if (
                    cndy.state.endSettings.number.toNumber() <
                    new Date().getTime() / 1000
                ) {
                    setIsEnded(true);
                    setIsActive(false);
                }
            }
            // end the mint when amount is reached
            if (cndy?.state.endSettings?.endSettingType.amount) {
                let limit = Math.min(
                    cndy.state.endSettings.number.toNumber(),
                    cndy.state.itemsAvailable,
                );
                setItemsAvailable(limit);
                if (cndy.state.itemsRedeemed < limit) {
                    setItemsRemaining(limit - cndy.state.itemsRedeemed);
                } else {
                    setItemsRemaining(0);
                    cndy.state.isSoldOut = true;
                    setIsEnded(true);
                }
            } else {
                setItemsRemaining(cndy.state.itemsRemaining);
            }

            if (cndy.state.isSoldOut) {
                setIsActive(false);
            }
        })();
    };

    const renderGoLiveDateCounter = ({days, hours, minutes, seconds}: any) => {
        return (
            <div><Card elevation={1}><h1>{days}</h1>Days</Card><Card elevation={1}><h1>{hours}</h1>
                Hours</Card><Card elevation={1}><h1>{minutes}</h1>Mins</Card><Card elevation={1}>
                <h1>{seconds}</h1>Secs</Card></div>
        );
    };

    const renderEndDateCounter = ({days, hours, minutes}: any) => {
        let label = "";
        if (days > 0) {
            label += days + " days "
        }
        if (hours > 0) {
            label += hours + " hours "
        }
        label += (minutes+1) + " minutes left to MINT."
        return (
            <div><h3>{label}</h3></div>
        );
    };

    function displaySuccess(mintPublicKey: any): void {
        let remaining = itemsRemaining - 1;
        setItemsRemaining(remaining);
        setIsSoldOut(remaining === 0);
        if (isBurnToken && whitelistTokenBalance && whitelistTokenBalance > 0) {
            let balance = whitelistTokenBalance - 1;
            setWhitelistTokenBalance(balance);
            setIsActive(isPresale && !isEnded && balance > 0);
        }
        setItemsRedeemed(itemsRedeemed + 1);
        const solFeesEstimation = 0.012; // approx
        if (!payWithSplToken && balance && balance > 0) {
            setBalance(balance - (whitelistEnabled ? whitelistPrice : price) - solFeesEstimation);
        }
        setSolanaExplorerLink(cluster === "devnet" || cluster === "testnet"
            ? ("https://solscan.io/token/" + mintPublicKey + "?cluster=" + cluster)
            : ("https://solscan.io/token/" + mintPublicKey));
        throwConfetti();
    };

    function throwConfetti(): void {
        confetti({
            particleCount: 400,
            spread: 70,
            origin: {y: 0.6},
        });
    }

    const onMint = async () => {
        try {
            setIsMinting(true);
            if (wallet && candyMachine?.program && wallet.publicKey) {
                const mint = anchor.web3.Keypair.generate();
                const mintTxId = (
                    await mintOneToken(candyMachine, wallet.publicKey, mint)
                )[0];

                let status: any = {err: true};
                if (mintTxId) {
                    status = await awaitTransactionSignatureConfirmation(
                        mintTxId,
                        props.txTimeout,
                        props.connection,
                        'singleGossip',
                        true,
                    );
                }

                if (!status?.err) {
                    setAlertState({
                        open: true,
                        message: 'Congratulations! Mint succeeded!',
                        severity: 'success',
                    });

                    // update front-end amounts
                    displaySuccess(mint.publicKey);
                } else {
                    setAlertState({
                        open: true,
                        message: 'Mint failed! Please try again!',
                        severity: 'error',
                    });
                }
            }
        } catch (error: any) {
            // TODO: blech:
            let message = error.msg || 'Minting failed! Please try again!';
            if (!error.msg) {
                if (!error.message) {
                    message = 'Transaction Timeout! Please try again.';
                } else if (error.message.indexOf('0x138')) {
                } else if (error.message.indexOf('0x137')) {
                    message = `SOLD OUT!`;
                } else if (error.message.indexOf('0x135')) {
                    message = `Insufficient funds to mint. Please fund your wallet.`;
                }
            } else {
                if (error.code === 311) {
                    message = `SOLD OUT!`;
                } else if (error.code === 312) {
                    message = `Minting period hasn't started yet.`;
                }
            }

            setAlertState({
                open: true,
                message,
                severity: "error",
            });
        } finally {
            setIsMinting(false);
        }
    };


    useEffect(() => {
        (async () => {
            if (wallet) {
                const balance = await props.connection.getBalance(wallet.publicKey);
                setBalance(balance / LAMPORTS_PER_SOL);
            }
        })();
    }, [wallet, props.connection]);

    useEffect(refreshCandyMachineState, [
        wallet,
        props.candyMachineId,
        props.connection,
        isEnded,
        isPresale
    ]);

    return (
        <main>
            <MainContainer>
               
                <header className="header">
    <div className="header__bottom">
      <div className="container">
        <nav className="navbar navbar-expand-xl align-items-center">
          <a className="site-logo site-title" href="index.html"><img src="assets/images/logo.png" alt="site-logo"></img><span >
              
              <i className="flaticon-fire"></i>
              </span></a>
          <button className="navbar-toggler ml-auto" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="menu-toggle"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav main-menu ml-auto">
              <li className="menu_has_children">
                <a href="https://vrakka.com/">Home</a>
               
              </li>
              <li className="menu_has_children">
                <a href="#story">Story</a>
                
              </li>
              <li className="menu_has_children">
                <a href="#nfts">NFTs</a>
                
              </li>
              <li className="menu_has_children">
                <a href="#collection">Collection</a>
              
              </li>
              <li><a href="#faqs">FAQs</a></li>
            </ul>
            
			<div className="nav-right">
            <WalletContainer><Wallet>
                        {wallet ?
                            <WalletAmount>{(balance || 0).toLocaleString()} SOL<ConnectButton/></WalletAmount> :
                            <ConnectButton className="cmn-btn ">Connect Wallet</ConnectButton>}
                    </Wallet></WalletContainer>
            </div>
          </div>
        </nav>
      </div>
    </div>
  </header>

                 
                   
          




                

                
                <section className="hero bg_img" data-background="assets/images/bg/hero.jpg">
      <div className="hero__shape">
        <img src="assets/images/elements/hero/shape.png" alt="vrakkaimg"></img>
      </div>
      <div className="el-1"><img src="assets/images/elements/hero/el-1.png" alt="vrakkaimg"></img></div>
      <div className="el-2"><img src="assets/images/elements/hero/el-2.png" alt="vrakkaimg"></img></div>
      <div className="el-3"><img src="assets/images/elements/hero/el-3.png" alt="vrakkaimg"></img></div>
      <div className="el-4"><img src="assets/images/elements/about-player.png" alt="vrakkaimg"></img></div>
      <div className="el-5"><img src="assets/images/elements/hero/el-5.png" alt="vrakkaimg"></img></div>
      <div className="el-6"><img src="assets/images/elements/hero/el-6.png" alt="vrakkaimg"></img></div>
      <div className="el-7"><img src="assets/images/elements/hero/el-7.png" alt="vrakkaimg"></img></div>
      <div className="el-9"><img src="assets/images/elements/hero/el-9.png" alt="vrakkaimg"></img></div>
      <div className="el-10"><img src="assets/images/elements/hero/el-10.png" alt="vrakkaimg"></img></div>
      <div className="el-11"><img src="assets/images/elements/hero/el-11.png" alt="vrakkaimg"></img></div>
      <div className="container">
        <div className="row">
          <div className="col-lg-8">
            <div className="hero__content">
              <span className="hero__sub-title wow fadeInUp" data-wow-duration="0.5s" data-wow-delay="0.3s">ARE YOU READY TO BE A HYPERHERO?</span>
              <h2 className="hero__title wow fadeInUp" data-wow-duration="0.5s" data-wow-delay="0.5s">IN YOUR HABITS IS YOUR FUTURE </h2>
              <p className="wow fadeInUp" data-wow-duration="0.5s" data-wow-delay="0.7s">As a community we give you the tools to achive your goals</p>
             
            </div>
          </div>
        </div>
      </div>
    </section>

     <section className=" pt-120 pb-120 position-relative overflow-hidden">
      <div className="about-obj-1" data-paroller-factor="-0.08" data-paroller-type="foreground" data-paroller-direction="horizontal"><img src="assets/images/elements/about-obj-1.png" alt="vrakkaimg"></img></div>
      <div className="about-obj-2" data-paroller-factor="0.08" data-paroller-type="foreground" data-paroller-direction="horizontal"><img src="assets/images/elements/about-obj-2.png" alt="vrakkaimg"></img></div>
      <div className="container">
        <div className="row">
		 <div className="col-lg-4 mt-lg-0 mt-4">
            <div className="about-thumb">
              <img src="assets/images/elements/hero/el-4.png" alt="vrakkaimg" className="image-1"></img>
              <img src="assets/images/elements/about-phone.png" alt="vrakkaimg" className="image-2"></img>
            </div>
          </div>
          <div className="col-lg-8">
            <div className="about-content">
              <div className="section-header has--bg">
                <div className="header-image style--two"><img src="assets/images/elements/header-el-2.png" alt="vrakkaimg"></img></div>
                <h2 className="section-title">WELCOME</h2>
              </div>
              <span className="hero__sub-title wow fadeInUp" data-wow-duration="0.5s" data-wow-delay="0.3s">JOIN US TO SAVE OUR PLANET AND HELP HUMANITY GROW AND WIN.</span>
			  
            </div>
            {wallet && isActive && whitelistEnabled && (whitelistTokenBalance > 0) && isBurnToken &&
                              <h3>You own {whitelistTokenBalance} WL mint {whitelistTokenBalance > 1 ? "tokens" : "token" }.</h3>}
                            {wallet && isActive && whitelistEnabled && (whitelistTokenBalance > 0) && !isBurnToken &&
                              <h3>You are whitelisted and allowed to mint.</h3>}

                            {wallet && isActive && endDate && Date.now() < endDate.getTime() &&
                              <Countdown
                                date={toDate(candyMachine?.state?.endSettings?.number)}
                                onMount={({completed}) => completed && setIsEnded(true)}
                                onComplete={() => {
                                    setIsEnded(true);
                                }}
                                renderer={renderEndDateCounter}
                              />}
                            {wallet && isActive &&
                              <h3>TOTAL MINTED : {itemsRedeemed} / {itemsAvailable}</h3>}
                            {wallet && isActive && <BorderLinearProgress variant="determinate"
                                                                         value={100 - (itemsRemaining * 100 / itemsAvailable)}/>}
                            <br/>
                            <MintButtonContainer>
                                {!isActive && !isEnded && candyMachine?.state.goLiveDate && (!isWLOnly || whitelistTokenBalance > 0) ? (
                                    <Countdown
                                        date={toDate(candyMachine?.state.goLiveDate)}
                                        onMount={({completed}) => completed && setIsActive(!isEnded)}
                                        onComplete={() => {
                                            setIsActive(!isEnded);
                                        }}
                                        renderer={renderGoLiveDateCounter}
                                    />) : (
                                    !wallet ? (
                                            <ConnectButton className="cmn-btn mt-5">Connect Wallet</ConnectButton>
                                        ) : (!isWLOnly || whitelistTokenBalance > 0) ?
                                        candyMachine?.state.gatekeeper &&
                                        wallet.publicKey &&
                                        wallet.signTransaction ? (
                                            <GatewayProvider
                                                wallet={{
                                                    publicKey:
                                                        wallet.publicKey ||
                                                        new PublicKey(CANDY_MACHINE_PROGRAM),
                                                    //@ts-ignore
                                                    signTransaction: wallet.signTransaction,
                                                }}
                                                // // Replace with following when added
                                                // gatekeeperNetwork={candyMachine.state.gatekeeper_network}
                                                gatekeeperNetwork={
                                                    candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                                                } // This is the ignite (captcha) network
                                                /// Don't need this for mainnet
                                                clusterUrl={rpcUrl}
                                                options={{autoShowModal: false}}
                                            >
                                                <MintButton
                                                    candyMachine={candyMachine}
                                                    isMinting={isMinting}
                                                    isActive={isActive}
                                                    isEnded={isEnded}
                                                    isSoldOut={isSoldOut}
                                                    onMint={onMint}
                                                />
                                            </GatewayProvider>
                                        ) : (
                                            <MintButton
                                                candyMachine={candyMachine}
                                                isMinting={isMinting}
                                                isActive={isActive}
                                                isEnded={isEnded}
                                                isSoldOut={isSoldOut}
                                                onMint={onMint}
                                            />
                                        ) :
                                        <h1>Mint is private.</h1>
                                        )}
                            </MintButtonContainer>
                            <br/>
                            {wallet && isActive && solanaExplorerLink &&
                              <SolExplorerLink href={solanaExplorerLink} target="_blank">View on Solscan</SolExplorerLink>}
          </div>
         
        </div>
      </div>
    </section>


    <section className="pt-120 pb-120 position-relative overflow-hidden" id="story">
      <div className="game-el-1" data-paroller-factor="-0.1" data-paroller-type="foreground" data-paroller-direction="vertical"><img src="assets/images/elements/game-el-1.png" alt="vrakkaimg"></img></div>
      <div className="game-el-2" data-paroller-factor="-0.1" data-paroller-type="foreground" data-paroller-direction="horizontal"><img src="assets/images/elements/game-el-2.png" alt="vrakkaimg"></img></div>
      <div className="game-el-3" data-paroller-factor="0.1" data-paroller-type="foreground" data-paroller-direction="horizontal"><img src="assets/images/elements/game-el-3.png" alt="vrakkaimg"></img></div>
      <div className="game-el-4" data-paroller-factor="0.25" data-paroller-type="foreground" data-paroller-direction="vertical"><img src="assets/images/elements/game-el-4.png" alt="vrakkaimg"></img></div>
      <div className="container" >
        <div className="row justify-content-center">
          <div className="col-lg-5">
            <div className="section-header text-center has--bg">
              <div className="header-image"><img src="assets/images/elements/header-el.png" alt="vrakkaimg"></img></div>
              <h2 className="section-title">Story</h2>
            </div>
          </div>
        </div>
        
        
		<div className="col-lg-12">
            <div className="testimonial-slider">
              <div className="testimonial-single">
				
                <div className="testimonial-single__content"  data-animation="fadeInUp" data-delay=".5s">
                  <p>The climate change has finally arrived, the planet Earth is devastated and there seems to be no solution.
Human beings in a relentless quest to change the future of their society, form a group of admirable people, called the “HyperHabits” with great physical and intellectual qualities, among others. The HiperHabits without losing their style, travel through the multiverse and its different times, seeking to change habits to improve the quality of life in the future that lies ahead.</p>
                  <span className="designation">BOOST YOUR SKILLS, MATCH YOUR NFT...</span>
                 
                </div>
              </div>
              </div>
          </div>
      </div>
    </section>





    <section className="pt-120 pb-120 position-relative" id="nfts">
      <div className="bg-el h-100"><img src="assets/images/bg/overview.jpg" alt="vrakkaimg" className="h-100"></img></div>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5">
            <div className="section-header text-center has--bg">
              <div className="header-image"><img src="assets/images/elements/header-el.png" alt="vrakkaimg"></img></div>
              <h2 className="section-title">NFTs</h2>
            </div>
          </div>
        </div>
        <div className="row justify-content-center mb-none-30">
           <div className="col-lg-3 col-md-6 mb-30 wow zoomIn" data-wow-duration="0.5s" data-wow-delay="0.3s">
		  <img src="assets/images/icon/overview/a1.png" alt="vrakkaimg"></img>
            <div className="overview-card">
			
              <div className="overview-card__icon">
              
				<h5>Enhancer</h5>
				<h4 className="overview-card__number">X4</h4>
				<p>6000-50%</p>
				<p>None</p>
              </div>
              <div className="overview-card__content">
                
              </div>
            </div>
            
          </div>
           <div className="col-lg-3 col-md-6 mb-30 wow zoomIn" data-wow-duration="0.5s" data-wow-delay="0.3s">
		  <img src="assets/images/icon/overview/a2.png" alt="vrakkaimg"></img>
            <div className="overview-card">
			
              <div className="overview-card__icon">
				<h5>Enhancer</h5>
				<h4 className="overview-card__number">X6</h4>
				<p>4200-35%</p>
				<p>Floor light</p>
              </div>
              <div className="overview-card__content">
                
              </div>
            </div>
            
          </div>
           <div className="col-lg-3 col-md-6 mb-30 wow zoomIn" data-wow-duration="0.5s" data-wow-delay="0.3s">
		  <img src="assets/images/icon/overview/a3.png" alt="vrakkaimg"></img>
            <div className="overview-card">
			
              <div className="overview-card__icon">
				<h5>Enhancer</h5>
				<h4 className="overview-card__number">X8</h4>
				<p>1440-12%</p>
				<p>Circle Aura</p>
              </div>
              <div className="overview-card__content">
                
              </div>
            </div>
            
          </div>
		   <div className="col-lg-3 col-md-6 mb-30 wow zoomIn" data-wow-duration="0.5s" data-wow-delay="0.3s">
		  <img src="assets/images/icon/overview/a4.png" alt="vrakkaimg"></img>
            <div className="overview-card">
			
              <div className="overview-card__icon">
				<h5>Enhancer</h5>
				<h4 className="overview-card__number">X10</h4>
				<p>360-3%</p>
				<p>Golden Energy</p>
              </div>
              <div className="overview-card__content">
                
              </div>
            </div>
            
          </div>
        </div>
        
        <div className="row justify-content-center wow fadeInUp" data-wow-duration="0.5s" data-wow-delay="0.5s">
          
        </div>
      </div><br></br>
    </section>


    <section className="pb-120">
	<br></br>
      <div className="container" id="roadmap">
        <div className="row">
          <div className="col-lg-12">
            <div className="view-all-header">
              <h2 className="title">Roadmap</h2>
              <a href="https://vrakka.com/" className="link"></a>
            </div>
          </div>
        </div>
        <div className="row mt-50 mb-none-30 justify-content-center">
          <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-30">
            <div className="game-small-card">
              <div className="game-small-card__thumb">
                <img src="assets/images/games/1.png" alt="vrakkaimg"></img>
              </div>
              <div className="game-small-card__content">
                <h6><a href="https://vrakka.com/">Q2 -  2022 Oriented community</a></h6>
              </div>
            </div>
          </div>
          <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-30">
            <div className="game-small-card">
              <div className="game-small-card__thumb">
                <img src="assets/images/games/2.png" alt="vrakkaimg"></img>
              </div>
              <div className="game-small-card__content">
                <h6><a href="https://vrakka.com/">Q2 -  2022 Whitelist</a></h6>
              </div>
            </div>
          </div>
          <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-30">
            <div className="game-small-card">
              <div className="game-small-card__thumb">
                <img src="assets/images/games/3.png" alt="vrakkaimg"></img>
              </div>
              <div className="game-small-card__content">
                <h6><a href="https://vrakka.com/">Q2 -  2022 Non reveal launch</a></h6>
              </div>
            </div>
          </div>
          <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-30">
            <div className="game-small-card">
              <div className="game-small-card__thumb">
                <img src="assets/images/games/4.png" alt="vrakkaimg"></img>
              </div>
              <div className="game-small-card__content">
                <h6><a href="https://vrakka.com/">Q3 y Q4 Revelación</a></h6>
              </div>
            </div>
          </div>
          <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-30">
            <div className="game-small-card">
              <div className="game-small-card__thumb">
                <img src="assets/images/games/5.png" alt="vrakkaimg"></img>
              </div>
              <div className="game-small-card__content">
                <h6><a href="https://vrakka.com/">Q3 y Q4 Involucrar personas en API</a></h6>
              </div>
            </div>
          </div>
          <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-30">
            <div className="game-small-card">
              <div className="game-small-card__thumb">
                <img src="assets/images/games/6.png" alt="vrakkaimg"></img>
              </div>
              <div className="game-small-card__content">
                <h6><a href="https://vrakka.com/">Q1  y Q2 - 2023  Lanzamiento en mercados </a></h6>
              </div>
            </div>
          </div>
		  <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-30">
            <div className="game-small-card">
              <div className="game-small-card__thumb">
                <img src="assets/images/games/7.png" alt="vrakkaimg"></img>
              </div>
              <div className="game-small-card__content">
                <h6><a href="https://vrakka.com/">Q1  y Q2 - 2023  Grow and win </a></h6>
              </div>
            </div>
          </div>
		  <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-30">
            <div className="game-small-card">
              <div className="game-small-card__thumb">
                <img src="assets/images/games/8.png" alt="vrakkaimg"></img>
              </div>
              <div className="game-small-card__content">
                <h6><a href="https://vrakka.com/">Q3 Venta y renta  </a></h6>
              </div>
            </div>
          </div>
		  <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-30">
            <div className="game-small-card">
              <div className="game-small-card__thumb">
                <img src="assets/images/games/9.png" alt="vrakkaimg"></img>
              </div>
              <div className="game-small-card__content">
                <h6><a href="https://vrakka.com/">Q3 Juegos Internos </a></h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>


   



    <section className="pt-120 pb-120 position-relative" id="nfts">
      <div className="bg-el h-100"><img src="assets/images/bg/back2.jpg" alt="vrakkaimg" className="h-100"></img></div>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5">
            <div className="section-header text-center has--bg">
              <div className="header-image"><img src="assets/images/elements/header-el.png" alt="vrakkaimg"></img></div>
              <h2 className="section-title">About Us</h2>
           </div>
           
          </div>
        </div>
        
        <div className="testimonial-single__content"  data-animation="fadeInUp" data-delay=".5s">
                  <p>MULTIVERSE HYPERHABITS is an NFT collection created in the vrakka ecosystem to improve
the quality of life in people and the realization of their good habits.
The collection is created with the purpose of turning users into heroes.</p>
               </div><br></br>

               <div className="col-lg-12">
         <span className="hero__sub-title wow fadeInUp text-center centrar" data-wow-duration="0.5s" data-wow-delay="0.3s">HOW?</span>
		
         <div className="testimonial-single__content"  data-animation="fadeInUp" data-delay=".5s">
         <p>You will have to comply with good habits, including the ones that contribute to society with good deeds.</p>
         <p>And for fulfilling habits you are rewarded with vrk tokens (the vrakka utility token).</p>
		</div>
        </div> 

        <div className="row justify-content-center mb-none-30">
          
        <div className="col-lg-3 col-md-6 mb-30 wow zoomIn" data-wow-duration="0.5s" data-wow-delay="0.3s">
		  <img src="assets/images/m1.png" alt="vrakkaimg"></img>
            <div className="overview-card2">
			    <div >
					<p>Your tokens are potentiated, therefore you have an advantage to recover your investment and keep winning.</p>
				</div>
            </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-30 wow zoomIn" data-wow-duration="0.5s" data-wow-delay="0.3s">
		  <img src="assets/images/m2.png" alt="vrakkaimg"></img>
            <div className="overview-card3">
			    <div >
					<p>You get discounts and promotions in the Marketplace for in-app products and services.</p>
				</div>
            </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-30 wow zoomIn" data-wow-duration="0.5s" data-wow-delay="0.3s">
		  <img src="assets/images/m3.png" alt="vrakkaimg"></img>
            <div className="overview-card3">
			    <div >
					<p>You have access to pre-sales of tokens and future products within the ecosystem.</p>
				</div>
            </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-30 wow zoomIn" data-wow-duration="0.5s" data-wow-delay="0.3s">
		  <img src="assets/images/m4.png" alt="vrakkaimg"></img>
            <div className="overview-card3">
			    <div >
					<p>You have EXCLUSIVE access to the VRK community</p>
				</div>
            </div>
        </div>


           
		   
        </div>
        
        <div className="row justify-content-center wow fadeInUp" data-wow-duration="0.5s" data-wow-delay="0.5s">
          
        </div>
      </div>
    </section><br></br><br></br>





<section >
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="section-header has--bg style--two">
              <div className="header-image style--two"><img src="assets/images/elements/header-el-4.png" alt="vrakkaimg"></img></div>
              <span className="section-sub-title">COLLECTION </span>
              <h2 className="section-title">YOU ARE JUST ONE STEP AWAY FROM GETTING UP... </h2>
            </div>
            <a href="https://vrakka.com/" className="cmn-btn">View all</a>
          </div><br></br><br></br>
		  
	<div className="col-lg-12">	<br></br><br></br>
  <div className="row">
  
    <div className="col-sm-3">
	 <div className="post-card">
                <div className="post-card__thumb">
                  <img src="assets/images/blog/2.jpg" alt="vrakkaimg"></img>
                </div>
                <div className="post-card__content">
                  <span className="date">10253</span>
                  <h3 className="post-title">Vrakka</h3>
                  <div className="post-author mt-3">
                    <div className="post-author__thumb">
                      <img src="assets/images/blog/author.png" alt="vrakkaimg"></img>
                    </div>
                    <a href="https://vrakka.com/" className="post-author__name">10 SOL</a>
                  </div>
                </div>
              </div>
	 </div>
	 
	 <div className="col-sm-3">
	 <div className="post-card">
                <div className="post-card__thumb">
                  <img src="assets/images/blog/1.jpg" alt="vrakkaimg"></img>
                </div>
                <div className="post-card__content">
                  <span className="date">11957</span>
                  <h3 className="post-title">Vrakka</h3>
                  <div className="post-author mt-3">
                    <div className="post-author__thumb">
                      <img src="assets/images/blog/author.png" alt="vrakkaimg"></img>
                    </div>
                    <a href="https://vrakka.com/" className="post-author__name">10 SOL</a>
                  </div>
                </div>
       </div>
	 </div>
	 
	 <div className="col-sm-3">
	 <div className="post-card">
                <div className="post-card__thumb">
                  <img src="assets/images/blog/3.jpg" alt="vrakkaimg"></img>
                </div>
                <div className="post-card__content">
                  <span className="date">11200</span>
                  <h3 className="post-title">Vrakka</h3>
                  <div className="post-author mt-3">
                    <div className="post-author__thumb">
                      <img src="assets/images/blog/author.png" alt="vrakkaimg"></img>
                    </div>
                    <a href="https://vrakka.com/" className="post-author__name">10 SOL</a>
                  </div>
                </div>
              </div>
	 </div>
	 
	 <div className="col-sm-3">
	  <div className="post-card">
                <div className="post-card__thumb">
                  <img src="assets/images/blog/4.jpg" alt="vrakkaimg"></img>
                </div>
                <div className="post-card__content">
                  <span className="date">11960</span>
                  <h3 className="post-title">Vrakka</h3>
                  <div className="post-author mt-3">
                    <div className="post-author__thumb">
                      <img src="assets/images/blog/author.png" alt="vrakkaimg"></img>
                    </div>
                    <a href="https://vrakka.com/" className="post-author__name">10 SOL</a>
                  </div>
                </div>
              </div>
	 </div>
	 
    
  </div>
</div>
        </div>
      </div>
    </section>
  


    <section className=" pt-120 pb-120 position-relative overflow-hidden">
      <div className="about-obj-1" data-paroller-factor="-0.08" data-paroller-type="foreground" data-paroller-direction="horizontal"><img src="assets/images/elements/about-obj-1.png" alt="vrakkaimg"></img></div>
         <div className="about-obj-2" data-paroller-factor="0.08" data-paroller-type="foreground" data-paroller-direction="horizontal"><img src="assets/images/elements/about-obj-2.png" alt="vrakkaimg"></img></div>
         <div className="container">
        <div className="row">
		<div className="col-lg-12">
            <div className="about-content">
             <div className="section-header text-center has--bg">
              <div className="header-image"><img src="assets/images/elements/header-el.png" alt="ime2343"></img></div>
              <h2 className="section-title">TEAM</h2>
            </div></div></div>
			   <div className="col-lg-6 mt-lg-0 mt-6">
            <div className="about-thumb">
              <img src="assets/images/team/1.png" alt="imagemine" className="image-1 centrar"></img>
			  
			   <span className="hero__sub-title wow fadeInUp text-center centrar" data-wow-duration="0.5s" data-wow-delay="0.3s">Yetix Founder</span>
          
            </div>
          </div>
		   <div className="col-lg-6 mt-lg-0 mt-6">
            <div className="about-thumb">
              <img src="assets/images/team/2.png" alt="imayerico" className="image-1 centrar"></img>
             <span className="hero__sub-title wow fadeInUp text-center centrar" data-wow-duration="0.5s" data-wow-delay="0.3s">Robocop Co-Founder</span>
            </div>
          </div>
		<div className="col-lg-12">
            <div className="about-content">
             <div className="section-header text-center has--bg">
              <div className="header-image"><img src="assets/images/elements/header-el.png" alt="moderationteam"></img></div>
              <h2 className="section-title">MODERATION TEAM</h2>
            </div></div></div>
            
            <div className="col-lg-4">
         <span className="hero__sub-title wow fadeInUp text-center centrar" data-wow-duration="0.5s" data-wow-delay="0.3s">Rulix</span>
		  <h6><a className="text-center centrar">MANAGER</a></h6>
		   <h6><a className="text-center centrar">MODERATOR</a></h6>
		</div>
		
		<div className="col-lg-4">
         <span className="hero__sub-title wow fadeInUp text-center centrar" data-wow-duration="0.5s" data-wow-delay="0.3s">Peterson</span>
		  <h6><a className="text-center centrar"> TEXT INFORMATION</a></h6>
		   <h6><a className="text-center centrar">MODERATOR</a></h6>
		</div>
		
		<div className="col-lg-4">
         <span className="hero__sub-title wow fadeInUp text-center centrar" data-wow-duration="0.5s" data-wow-delay="0.3s">Poly</span>
		  <h6><a className="text-center centrar">CREATIVE & MKT</a></h6>
		   <h6><a className="text-center centrar">MODERATOR</a></h6>
		</div>
         
        </div>
        </div>   
    </section>



                <div className="container">
     
     <div className="row footer-bottom align-items-center">
       <div className="col-lg-7 col-md-6 text-md-left text-center">
         <p className="copy-right-text">Copyright © 2022. VrakkaNft.com <a href="https://vrakka.com/">Vrakka</a></p>
       </div>
       <div className="col-lg-5 col-md-6 mt-md-0 mt-3">
         <ul className="social-links justify-content-md-end justify-content-center">
           <li><a href="https://vrakka.com/"><i className="lab la-facebook-f"></i></a></li>
         
         </ul>
       </div>
     </div>
   </div>
 
 


             
            </MainContainer>
            <Snackbar
                open={alertState.open}
                autoHideDuration={6000}
                onClose={() => setAlertState({...alertState, open: false})}
            >
                <Alert
                    onClose={() => setAlertState({...alertState, open: false})}
                    severity={alertState.severity}
                >
                    {alertState.message}
                </Alert>
            </Snackbar>
        </main>
    );
};

export default Home;

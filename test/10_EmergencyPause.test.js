const Pool1 = artifacts.require('Pool1');
const PoolData = artifacts.require('PoolData');
const NXMaster = artifacts.require('NXMaster');
const NXMToken = artifacts.require('NXMToken');
const TokenFunctions = artifacts.require('TokenFunctions');
const TokenController = artifacts.require('TokenController');
const Claims = artifacts.require('Claims');
const ClaimsData = artifacts.require('ClaimsData');
const ClaimsReward = artifacts.require('ClaimsReward');
const QuotationDataMock = artifacts.require('QuotationDataMock');
const Quotation = artifacts.require('Quotation');
const TokenData = artifacts.require('TokenData');
const MCR = artifacts.require('MCR');

const { assertRevert } = require('./utils/assertRevert');
const { advanceBlock } = require('./utils/advanceToBlock');
const { ether } = require('./utils/ether');
const { duration } = require('./utils/increaseTime');
const { latestTime } = require('./utils/latestTime');

const CLA = '0x434c41';
const fee = ether(0.002);
const PID = 0;
const smartConAdd = '0xd0a6e6c54dbc68db5db3a091b171a77407ff7ccf';
const coverPeriod = 61;
const coverDetails = [1, 3362445813369838, 744892736679184, 7972408607];
const v = 28;
const r = '0x66049184fb1cf394862cca6c3b2a0c462401a671d0f2b20597d121e56768f90a';
const s = '0x4c28c8f8ff0548dd3a41d7c75621940eb4adbac13696a2796e98a59691bf53ff';
const AdvisoryBoard = '0x41420000';

let P1;
let nxms;
let cr;
let cl;
let qd;
let qt;
let mcr;

const BigNumber = web3.BigNumber;
require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('NXMaster: Emergency Pause', function([
  owner,
  member1,
  member2,
  member3,
  coverHolder1,
  coverHolder2,
  newMember
]) {
  const stakeTokens = ether(1);
  const tokens = ether(200);
  const validity = duration.days(30);
  const UNLIMITED_ALLOWANCE = new BigNumber(2).pow(256).minus(1);

  before(async function() {
    await advanceBlock();
    tk = await NXMToken.deployed();
    tf = await TokenFunctions.deployed();
    tc = await TokenController.deployed();
    nxms = await NXMaster.deployed();
    cr = await ClaimsReward.deployed();
    cl = await Claims.deployed();
    cd = await ClaimsData.deployed();
    qd = await QuotationDataMock.deployed();
    P1 = await Pool1.deployed();
    pd = await PoolData.deployed();
    qt = await Quotation.deployed();
    td = await TokenData.deployed();
    mcr = await MCR.deployed();
    await tf.payJoiningFee(member1, { from: member1, value: fee });
    await tf.kycVerdict(member1, true);
    await tk.approve(tc.address, UNLIMITED_ALLOWANCE, { from: member1 });
    await tf.payJoiningFee(member2, { from: member2, value: fee });
    await tf.kycVerdict(member2, true);
    await tk.approve(tc.address, UNLIMITED_ALLOWANCE, { from: member2 });
    await tf.payJoiningFee(member3, { from: member3, value: fee });
    await tf.kycVerdict(member3, true);
    await tf.payJoiningFee(coverHolder1, {
      from: coverHolder1,
      value: fee
    });
    await tf.kycVerdict(coverHolder1, true);
    await tk.approve(tc.address, UNLIMITED_ALLOWANCE, { from: coverHolder1 });
    await tf.payJoiningFee(coverHolder2, {
      from: coverHolder2,
      value: fee
    });
    await tf.kycVerdict(coverHolder2, true);
    await tk.approve(tc.address, UNLIMITED_ALLOWANCE, { from: coverHolder2 });
    await tk.transfer(member1, tokens);
    await tk.transfer(member2, tokens);
    await tk.transfer(member3, tokens);
    await tk.transfer(coverHolder1, tokens);
    await tk.transfer(coverHolder2, tokens);
    await tf.addStake(smartConAdd, stakeTokens, { from: member1 });
    await tf.addStake(smartConAdd, stakeTokens, { from: member2 });
    maxVotingTime = await cd.maxVotingTime();
  });

  describe('Before Emergency Pause', function() {
    before(async function() {
      await P1.makeCoverBegin(
        PID,
        smartConAdd,
        'ETH',
        coverDetails,
        coverPeriod,
        v,
        r,
        s,
        { from: coverHolder1, value: coverDetails[1] }
      );

      await P1.makeCoverBegin(
        PID,
        smartConAdd,
        'ETH',
        coverDetails,
        coverPeriod,
        v,
        r,
        s,
        { from: coverHolder2, value: coverDetails[1] }
      );

      await tc.lock(CLA, ether(60), validity, {
        from: member1
      });
      await tc.lock(CLA, ether(9), validity, {
        from: member2
      });
    });
    it('should return false for isPause', async function() {
      (await nxms.isPause()).should.equal(false);
    });
    it('should let submit claim', async function() {
      const coverID = await qd.getAllCoversOfUser(coverHolder1);
      await cl.submitClaim(coverID[0], { from: coverHolder1 });
      const claimId = (await cd.actualClaimLength()) - 1;
      claimId.should.be.bignumber.equal(1);
      (await qd.getCoverStatusNo(claimId)).should.be.bignumber.equal(4);
    });
  });

  describe('Emergency Pause: Active', function() {
    let startTime;
    before(async function() {
      const totalFee = fee.plus(coverDetails[1].toString());
      await qt.verifyQuote(
        PID,
        smartConAdd,
        'ETH',
        coverDetails,
        coverPeriod,
        v,
        r,
        s,
        { from: newMember, value: totalFee }
      );

      await nxms.startEmergencyPause();
      startTime = await latestTime();
    });
    it('should return true for isPause', async function() {
      (await nxms.isPause()).should.equal(true);
    });
    it('should return emergency pause details', async function() {
      await nxms.getEmergencyPauseByIndex(0);
      const epd = await nxms.getLastEmergencyPause();
      epd[0].should.equal(true);
      epd[1].should.be.bignumber.equal(startTime);
      epd[2].should.equal(AdvisoryBoard);
    });
    it('should not be able to trigger kyc', async function() {
      await assertRevert(qt.kycTrigger(true, 1));
    });
    it('add claim to queue', async function() {
      const coverID = await qd.getAllCoversOfUser(coverHolder2);
      await cl.submitClaim(coverID[0], { from: coverHolder2 });
      (await qd.getCoverStatusNo(coverID[0])).should.be.bignumber.equal(5);
    });
    it('should not let member vote for claim assessment', async function() {
      const claimId = (await cd.actualClaimLength()) - 1;
      await assertRevert(cl.submitCAVote(claimId, -1, { from: member1 }));
    });
    it('should not be able to change claim status', async function() {
      const claimId = (await cd.actualClaimLength()) - 1;
      await assertRevert(cr.changeClaimStatus(claimId, { from: owner }));
    });
    it('should not be able to add currency', async function() {
      await assertRevert(mcr.addCurrency('0x4c4f4c', { from: owner }));
    });
  });

  describe('Emergency Pause: Inactive', function() {
    before(async function() {
      await nxms.addEmergencyPause(false, AdvisoryBoard);
    });
    describe('Resume Everything', function() {
      it('should return false for isPause', async function() {
        (await nxms.isPause()).should.equal(false);
      });
      it('should submit queued claims', async function() {
        (await nxms.isPause()).should.equal(false);
        const claimId = (await cd.actualClaimLength()) - 1;
        claimId.should.be.bignumber.equal(2);
        (await qd.getCoverStatusNo(claimId)).should.be.bignumber.equal(4);
      });
    });
  });
});